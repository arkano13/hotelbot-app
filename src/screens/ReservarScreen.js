import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { api } from "../api/client";
import CalendarioModal from "../components/CalendarioModal";

function formatearFecha(date) {
  return date.toISOString().slice(0, 10);
}

function formatearFechaLegible(date) {
  return date.toLocaleDateString("es-HN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function sumarDias(date, dias) {
  const nueva = new Date(date);
  nueva.setDate(nueva.getDate() + dias);
  return nueva;
}

const COLORES_ESTADO_HABITACION = {
  LIBRE: { fondo: "#f0fdf4", borde: "#22c55e", texto: "#166534" },
  RESERVADA_PENDIENTE: { fondo: "#fefce8", borde: "#eab308", texto: "#854d0e" },
  OCUPADA: { fondo: "#fef2f2", borde: "#ef4444", texto: "#991b1b" },
};

const METODOS_PAGO = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "transferencia", etiqueta: "Transferencia" },
  { valor: "tarjeta", etiqueta: "Tarjeta" },
];

export default function ReservarScreen({ navigation }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [documento, setDocumento] = useState("");

  const [yaPago, setYaPago] = useState(false); // false = paga al llegar

  const [fechaEntradaDate, setFechaEntradaDate] = useState(new Date());
  const [fechaHoyServidor, setFechaHoyServidor] = useState(null);
  const [calendarioVisible, setCalendarioVisible] = useState(false);
  const [noches, setNoches] = useState(1);
  const [metodoPago, setMetodoPago] = useState(null);
  const [precio, setPrecio] = useState("");

  const [buscando, setBuscando] = useState(false);
  const [habitaciones, setHabitaciones] = useState(null);
  const [habitacionId, setHabitacionId] = useState(null);
  const [habitacionSeleccionada, setHabitacionSeleccionada] = useState(null);
  const [creando, setCreando] = useState(false);
  const creandoRef = useRef(false);
  const idempotencyKeyRef = useRef(null);

  useEffect(() => {
    api
      .obtenerFechaActual()
      .then((datos) => {
        setFechaHoyServidor(datos.fecha);
        setFechaEntradaDate(new Date(`${datos.fecha}T00:00:00`));
      })
      .catch(() => {});
  }, []);

  const fechaSalidaDate = sumarDias(fechaEntradaDate, noches);
  const fechaEntrada = formatearFecha(fechaEntradaDate);
  const fechaSalida = formatearFecha(fechaSalidaDate);

  function limpiarBusqueda() {
    setHabitaciones(null);
    setHabitacionId(null);
    setHabitacionSeleccionada(null);
  }

  async function buscarHabitaciones() {
    setBuscando(true);
    limpiarBusqueda();
    try {
      const datos = await api.buscarHabitacionesPorCapacidad({
        fechaEntrada,
        fechaSalida,
      });
      setHabitaciones(datos);
    } catch (err) {
      Alert.alert("Error al buscar", err.message);
    } finally {
      setBuscando(false);
    }
  }

  function tocarHabitacion(habitacion) {
    if (habitacion.estado === "OCUPADA") {
      Alert.alert(
        "Habitación ocupada",
        `Hab. ${habitacion.numero} ya está ocupada o confirmada${
          habitacion.reserva?.cliente ? ` (${habitacion.reserva.cliente})` : ""
        }.`
      );
      return;
    }

    if (habitacion.estado === "RESERVADA_PENDIENTE") {
      Alert.alert(
        "Habitación reservada, sin pagar",
        `Hab. ${habitacion.numero} tiene una reserva pendiente de pago${
          habitacion.reserva?.cliente ? ` a nombre de ${habitacion.reserva.cliente}` : ""
        }.`
      );
      return;
    }

    setHabitacionId(habitacion.id);
    setHabitacionSeleccionada(habitacion);
  }

  async function crear() {
    if (!nombre.trim()) {
      Alert.alert("Falta el nombre", "Escribe el nombre del huésped.");
      return;
    }
    if (!habitacionId) {
      Alert.alert("Elige una habitación", "Primero busca y selecciona una habitación libre.");
      return;
    }
    if (yaPago && !metodoPago) {
      Alert.alert("Falta el método de pago", "Elige cómo pagó: efectivo, transferencia o tarjeta.");
      return;
    }
    const precioNumero = Number(precio);
    if (!precio || !Number.isFinite(precioNumero) || precioNumero <= 0) {
      Alert.alert("Falta el precio", "Escribe cuánto costará cada noche.");
      return;
    }

    if (creandoRef.current) return;
    creandoRef.current = true;
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `app:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    }

    setCreando(true);
    try {
      await api.crearWalkIn({
        nombre,
        telefono,
        documento,
        fechaEntrada,
        fechaSalida,
        personas: habitacionSeleccionada.capacidad,
        habitacionId,
        metodoPago: yaPago ? metodoPago : undefined,
        tipoEstadia: "NOCHE",
        modo: "RESERVAR",
        yaPago,
        precioPorNoche: precioNumero,
        idempotencyKey: idempotencyKeyRef.current,
      });
      Alert.alert(
        "Listo",
        yaPago
          ? "La reserva quedó apartada y pagada. El huésped hace check-in normal desde Entrada el día que llegue."
          : "La reserva quedó apartada, sin cobrar todavía. Tiene 24 horas para llegar — si no, se libera sola.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      creandoRef.current = false;
      Alert.alert("No se pudo crear", err.message);
    } finally {
      setCreando(false);
    }
  }

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido}>
      <Text style={styles.leyendaTop}>
        Aparta la habitación para una fecha (hoy o después) — no la ocupa todavía, el huésped hace check-in normal el día que llegue.
      </Text>

      <Text style={styles.etiqueta}>Nombre completo</Text>
      <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Juan Pérez" />

      <Text style={styles.etiqueta}>Teléfono</Text>
      <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" placeholder="99999999" />

      <Text style={styles.etiqueta}>Número de identidad (DNI)</Text>
      <TextInput style={styles.input} value={documento} onChangeText={setDocumento} keyboardType="number-pad" placeholder="0801199912345" />

      <Text style={styles.etiqueta}>Entrada</Text>
      <View style={styles.filaChips}>
        <TouchableOpacity style={styles.chip} onPress={() => setCalendarioVisible(true)}>
          <Text style={styles.chipTexto}>📅 Elegir fecha</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.fechaLegible}>{formatearFechaLegible(fechaEntradaDate)}</Text>

      <Text style={styles.etiqueta}>¿Cuántas noches?</Text>
      <View style={styles.filaContador}>
        <TouchableOpacity
          style={styles.botonContador}
          onPress={() => {
            if (noches > 1) {
              setNoches(noches - 1);
              limpiarBusqueda();
            }
          }}
        >
          <Text style={styles.botonContadorTexto}>−</Text>
        </TouchableOpacity>
        <Text style={styles.contadorNumero}>{noches}</Text>
        <TouchableOpacity
          style={styles.botonContador}
          onPress={() => {
            setNoches(noches + 1);
            limpiarBusqueda();
          }}
        >
          <Text style={styles.botonContadorTexto}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.fechaLegible}>Sale el {formatearFechaLegible(fechaSalidaDate)}</Text>

      <Text style={styles.etiqueta}>Precio por noche</Text>
      <TextInput
        style={styles.input}
        value={precio}
        onChangeText={setPrecio}
        keyboardType="decimal-pad"
        placeholder="Ej. 500"
      />

      <TouchableOpacity style={styles.botonBuscar} onPress={buscarHabitaciones} disabled={buscando}>
        {buscando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonBuscarTexto}>Buscar habitaciones</Text>}
      </TouchableOpacity>

      {habitaciones && (
        <View style={styles.bloqueHabitaciones}>
          <Text style={styles.etiqueta}>Elige la habitación</Text>
          <Text style={styles.leyenda}>🟩 Libre &nbsp; 🟨 Reservada, sin pagar &nbsp; 🟥 Ocupada</Text>
          <View style={styles.filaChips}>
            {habitaciones.map((h) => {
              const colores = COLORES_ESTADO_HABITACION[h.estado];
              const seleccionada = habitacionId === h.id;

              return (
                <TouchableOpacity
                  key={h.id}
                  style={[
                    styles.habitacionChip,
                    { backgroundColor: colores.fondo, borderColor: colores.borde },
                    seleccionada && styles.habitacionChipSeleccionada,
                  ]}
                  onPress={() => tocarHabitacion(h)}
                >
                  <Text style={[styles.habitacionChipTexto, { color: colores.texto }]}>Hab. {h.numero}</Text>
                  <Text style={[styles.habitacionChipSub, { color: colores.texto }]}>cap. {h.capacidad}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {habitaciones.length === 0 && <Text style={styles.vacio}>No hay habitaciones disponibles.</Text>}
        </View>
      )}

      <Text style={styles.etiqueta}>¿Ya pagó?</Text>
      <View style={styles.filaChips}>
        <TouchableOpacity
          style={[styles.chip, !yaPago && styles.chipSeleccionadoAmbar]}
          onPress={() => setYaPago(false)}
        >
          <Text style={[styles.chipTexto, !yaPago && styles.chipTextoSeleccionado]}>
            🕓 Paga al llegar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, yaPago && styles.chipSeleccionado]}
          onPress={() => setYaPago(true)}
        >
          <Text style={[styles.chipTexto, yaPago && styles.chipTextoSeleccionado]}>
            ✅ Ya pagó
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.fechaLegible}>
        {yaPago
          ? "Se registra el pago ahora — la reserva queda apartada sin vencimiento."
          : "No se cobra nada todavía — tiene 24 horas para llegar, si no, se libera sola."}
      </Text>

      {yaPago && (
        <>
          <Text style={styles.etiqueta}>Método de pago</Text>
          <View style={styles.filaChips}>
            {METODOS_PAGO.map((metodo) => (
              <TouchableOpacity
                key={metodo.valor}
                style={[styles.chip, metodoPago === metodo.valor && styles.chipSeleccionado]}
                onPress={() => setMetodoPago(metodo.valor)}
              >
                <Text style={[styles.chipTexto, metodoPago === metodo.valor && styles.chipTextoSeleccionado]}>
                  {metodo.etiqueta}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity
        style={[
          styles.botonCrear,
          (!habitacionId || !precio || (yaPago && !metodoPago) || creando) && styles.botonDeshabilitado,
        ]}
        onPress={crear}
        disabled={!habitacionId || !precio || (yaPago && !metodoPago) || creando}
      >
        {creando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonBuscarTexto}>Reservar</Text>}
      </TouchableOpacity>

      <CalendarioModal
        visible={calendarioVisible}
        fechaSeleccionada={fechaEntradaDate}
        fechaHoyServidor={fechaHoyServidor}
        onSeleccionar={(fecha) => {
          setFechaEntradaDate(fecha);
          setCalendarioVisible(false);
          limpiarBusqueda();
        }}
        onCerrar={() => setCalendarioVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  contenido: { padding: 16, paddingBottom: 40 },
  leyendaTop: { fontSize: 13, color: "#64748b", marginBottom: 8 },
  etiqueta: { fontSize: 13, fontWeight: "600", color: "#475569", marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 10, fontSize: 15 },
  fechaLegible: { fontSize: 13, color: "#64748b", marginTop: 6 },
  filaChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minWidth: 48,
    alignItems: "center",
  },
  chipSeleccionado: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipSeleccionadoAmbar: { backgroundColor: "#d97706", borderColor: "#d97706" },
  chipTexto: { color: "#334155", fontSize: 14, fontWeight: "600" },
  chipTextoSeleccionado: { color: "#fff" },
  filaContador: { flexDirection: "row", alignItems: "center", gap: 16 },
  botonContador: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center" },
  botonContadorTexto: { fontSize: 20, fontWeight: "700", color: "#334155" },
  contadorNumero: { fontSize: 18, fontWeight: "700", color: "#1e293b", minWidth: 24, textAlign: "center" },
  botonBuscar: { backgroundColor: "#2563eb", borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 22 },
  botonBuscarTexto: { color: "#fff", fontWeight: "700" },
  bloqueHabitaciones: { marginTop: 6 },
  leyenda: { fontSize: 12, color: "#64748b", marginBottom: 8 },
  vacio: { color: "#94a3b8", fontSize: 13, marginTop: 6 },
  habitacionChip: { borderWidth: 2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, alignItems: "center", minWidth: 76 },
  habitacionChipSeleccionada: { borderWidth: 3 },
  habitacionChipTexto: { fontWeight: "700", fontSize: 14 },
  habitacionChipSub: { fontSize: 11, marginTop: 2 },
  botonCrear: { backgroundColor: "#0891b2", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 26 },
  botonDeshabilitado: { opacity: 0.5 },
});
