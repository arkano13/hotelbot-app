import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../api/client";
import { esEstadiaPorHoras, textoHorario } from "../utils/estadia";

const TEXTO_ESTADO = {
  PENDIENTE_PAGO: "Pendiente de pago",
  CONFIRMADA: "Confirmada",
  CHECK_IN: "Hospedado ahora",
};

function fecha(fechaISO) {
  return new Date(fechaISO).toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function EditarReservasScreen({ route }) {
  const [reservas, setReservas] = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [duracion, setDuracion] = useState("");
  const [habitaciones, setHabitaciones] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [moviendo, setMoviendo] = useState(false);
  const seleccionAutomaticaHecha = useRef(false);

  const cargar = useCallback(async () => {
    try {
      setReservas(await api.obtenerReservasActivasParaMover());
    } catch (error) {
      Alert.alert("Error al cargar", error.message);
    }
  }, []);

  useEffect(() => {
    cargar().finally(() => setCargando(false));
  }, [cargar]);

  useEffect(() => {
    const habitacionNumero = route.params?.habitacionNumero;
    if (!reservas || !habitacionNumero || seleccionAutomaticaHecha.current) return;

    const reserva = reservas.find(
      (item) => String(item.habitacionActual) === String(habitacionNumero)
    );
    seleccionAutomaticaHecha.current = true;
    if (reserva) elegir(reserva);
  }, [reservas, route.params?.habitacionNumero]);

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  async function elegir(reserva) {
    setSeleccionada(reserva);
    setNombre(reserva.cliente);
    setPrecio(String(reserva.precioPorNoche));
    const horas = Math.max(
      1,
      Math.round((new Date(reserva.fechaSalida) - new Date(reserva.fechaEntrada)) / 3600000)
    );
    setDuracion(String(reserva.tipoEstadia === "3_HORAS" ? horas : reserva.cantidadNoches));
    setHabitaciones(null);
    try {
      setHabitaciones(await api.obtenerHabitacionesLibresParaMover(reserva.id));
    } catch (error) {
      Alert.alert("No se cargaron las habitaciones libres", error.message);
    }
  }

  function volver() {
    setSeleccionada(null);
    setHabitaciones(null);
  }

  async function guardar() {
    const precioNumero = Number(precio);
    const duracionNumero = Number(duracion);
    if (!nombre.trim()) return Alert.alert("Falta el nombre", "Escribe el nombre del cliente.");
    if (!Number.isFinite(precioNumero) || precioNumero <= 0) {
      return Alert.alert("Precio inválido", "Escribe un precio mayor a cero.");
    }
    if (!Number.isFinite(duracionNumero) || duracionNumero <= 0) {
      return Alert.alert("Duración inválida", "Escribe una duración válida.");
    }

    setGuardando(true);
    try {
      await api.editarReserva(seleccionada.id, {
        nombreCliente: nombre.trim(),
        precioPorNoche: precioNumero,
        ...(seleccionada.tipoEstadia === "3_HORAS"
          ? { horas: duracionNumero }
          : { cantidadNoches: Math.round(duracionNumero) }),
      });
      Alert.alert("Listo", "Los cambios se guardaron correctamente.");
      await cargar();
      volver();
    } catch (error) {
      Alert.alert("No se pudo guardar", error.message);
    } finally {
      setGuardando(false);
    }
  }

  function confirmarMover(habitacion) {
    Alert.alert(
      `Mover a Hab. ${habitacion.numero}`,
      `${seleccionada.cliente} pasará de la Hab. ${seleccionada.habitacionActual} a la Hab. ${habitacion.numero}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, mover",
          onPress: async () => {
            setMoviendo(true);
            try {
              await api.moverHabitacion(seleccionada.id, habitacion.id);
              Alert.alert("Listo", `La reserva ahora está en la Hab. ${habitacion.numero}.`);
              await cargar();
              volver();
            } catch (error) {
              Alert.alert("No se pudo mover", error.message);
            } finally {
              setMoviendo(false);
            }
          },
        },
      ]
    );
  }

  if (cargando) {
    return <View style={styles.centrado}><ActivityIndicator size="large" color="#7c3aed" /></View>;
  }

  if (seleccionada) {
    return (
      <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido}>
        <TouchableOpacity onPress={volver}><Text style={styles.atras}>‹ Volver</Text></TouchableOpacity>
        <Text style={styles.encabezado}>Hab. {seleccionada.habitacionActual} · {seleccionada.codigo}</Text>
        <Text style={styles.fechas}>{fecha(seleccionada.fechaEntrada)} → {fecha(seleccionada.fechaSalida)}</Text>
        {esEstadiaPorHoras(seleccionada) && (
          <Text style={styles.horario}>⏱ {textoHorario(seleccionada)}</Text>
        )}

        <Text style={styles.etiqueta}>Nombre del cliente</Text>
        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} />

        <Text style={styles.etiqueta}>Precio {seleccionada.tipoEstadia === "3_HORAS" ? "total" : "por noche"}</Text>
        <TextInput style={styles.input} value={precio} onChangeText={setPrecio} keyboardType="decimal-pad" />

        <Text style={styles.etiqueta}>{seleccionada.tipoEstadia === "3_HORAS" ? "Cantidad de horas" : "Cantidad de noches"}</Text>
        <TextInput style={styles.input} value={duracion} onChangeText={setDuracion} keyboardType="number-pad" />

        <TouchableOpacity style={styles.guardar} onPress={guardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Guardar cambios</Text>}
        </TouchableOpacity>

        <Text style={styles.seccion}>Mover a otra habitación</Text>
        {habitaciones === null ? (
          <ActivityIndicator color="#2563eb" />
        ) : habitaciones.length === 0 ? (
          <Text style={styles.vacio}>No hay otras habitaciones libres para esas fechas.</Text>
        ) : (
          <View style={styles.grid}>
            {habitaciones.map((habitacion) => (
              <TouchableOpacity
                key={habitacion.id}
                style={styles.habitacion}
                onPress={() => confirmarMover(habitacion)}
                disabled={moviendo}
              >
                <Text style={styles.habitacionNumero}>Hab. {habitacion.numero}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.contenedor}
      contentContainerStyle={styles.contenido}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}
    >
      <Text style={styles.ayuda}>Selecciona una reserva activa para cambiar nombre, precio, duración o habitación.</Text>
      {reservas?.length === 0 && <Text style={styles.vacio}>No hay reservas activas.</Text>}
      {reservas?.map((reserva) => (
        <TouchableOpacity key={reserva.id} style={styles.tarjeta} onPress={() => elegir(reserva)}>
          <View style={styles.numero}><Text style={styles.numeroTexto}>{reserva.habitacionActual}</Text></View>
          <View style={styles.info}>
            <Text style={styles.nombre}>{reserva.cliente}</Text>
            <Text style={styles.detalle}>{reserva.codigo} · {TEXTO_ESTADO[reserva.estado] || reserva.estado}</Text>
            <Text style={styles.detalle}>{fecha(reserva.fechaEntrada)} → {fecha(reserva.fechaSalida)} · L {Number(reserva.precioTotal).toFixed(2)}</Text>
            {esEstadiaPorHoras(reserva) && (
              <Text style={styles.horario}>⏱ {textoHorario(reserva)}</Text>
            )}
          </View>
          <Text style={styles.flecha}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  contenido: { padding: 16, paddingBottom: 40 },
  centrado: { flex: 1, alignItems: "center", justifyContent: "center" },
  ayuda: { color: "#64748b", marginBottom: 14 },
  tarjeta: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: "#7c3aed" },
  numero: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#f3e8ff", alignItems: "center", justifyContent: "center", marginRight: 12 },
  numeroTexto: { fontWeight: "800", color: "#7c3aed", fontSize: 17 },
  info: { flex: 1 },
  nombre: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  detalle: { fontSize: 12, color: "#64748b", marginTop: 3 },
  flecha: { fontSize: 28, color: "#cbd5e1" },
  atras: { color: "#2563eb", fontWeight: "600", marginBottom: 14 },
  encabezado: { fontSize: 20, fontWeight: "800", color: "#1e293b" },
  fechas: { color: "#64748b", marginTop: 4 },
  horario: { fontSize: 13, color: "#b45309", fontWeight: "700", marginTop: 3 },
  etiqueta: { fontSize: 13, fontWeight: "600", color: "#475569", marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 9, padding: 11, fontSize: 15 },
  guardar: { backgroundColor: "#7c3aed", borderRadius: 9, padding: 14, alignItems: "center", marginTop: 22 },
  botonTexto: { color: "#fff", fontWeight: "700" },
  seccion: { fontSize: 17, fontWeight: "800", color: "#1e293b", marginTop: 30, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  habitacion: { backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#93c5fd", borderRadius: 10, paddingVertical: 13, paddingHorizontal: 16 },
  habitacionNumero: { color: "#1d4ed8", fontWeight: "700" },
  vacio: { color: "#94a3b8", textAlign: "center", marginTop: 24 },
});
