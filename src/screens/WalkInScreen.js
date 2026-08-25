import { useState, useEffect } from "react";
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

export default function WalkInScreen({ navigation }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [documento, setDocumento] = useState("");

  const [tipoEstadia, setTipoEstadia] = useState("noche"); // "noche" | "3horas"
  const [modo, setModo] = useState("ocupar"); // "ocupar" | "reservar"

  const [fechaEntradaDate, setFechaEntradaDate] = useState(new Date());
  const [fechaHoyServidor, setFechaHoyServidor] = useState(null);
  const [calendarioVisible, setCalendarioVisible] = useState(false);
  const [noches, setNoches] = useState(1);
  const [personas, setPersonas] = useState(null);
  const [metodoPago, setMetodoPago] = useState(null);

  const [buscando, setBuscando] = useState(false);
  const [habitaciones, setHabitaciones] = useState(null);
  const [habitacionId, setHabitacionId] = useState(null);
  const [creando, setCreando] = useState(false);

  const esPorHoras = tipoEstadia === "3horas";

  // Al abrir la pantalla, consulta al servidor qué día es realmente en
  // Honduras — así el calendario y la fecha inicial no dependen del
  // reloj del tablet (que puede tener mal la zona horaria).
  useEffect(() => {
    api
      .obtenerFechaActual()
      .then((datos) => {
        setFechaHoyServidor(datos.fecha);
        setFechaEntradaDate(new Date(`${datos.fecha}T00:00:00`));
      })
      .catch(() => {
        // Si falla, seguimos con la fecha del dispositivo como respaldo
        // — no bloqueamos la pantalla por esto.
      });
  }, []);


  const fechaSalidaDate = sumarDias(fechaEntradaDate, noches);
  const fechaEntrada = formatearFecha(fechaEntradaDate);
  const fechaSalida = formatearFecha(fechaSalidaDate);

  function limpiarBusqueda() {
    setHabitaciones(null);
    setHabitacionId(null);
  }

  function elegirPersonas(cantidad) {
    setPersonas(cantidad);
    limpiarBusqueda();
  }

  function elegirTipoEstadia(tipo) {
    setTipoEstadia(tipo);
    limpiarBusqueda();
    if (tipo === "3horas") {
      // Una estadía de 3 horas siempre entra ahora mismo, hoy.
      setFechaEntradaDate(new Date());
    }
  }

  async function buscarHabitaciones() {
    if (!personas) {
      Alert.alert("Falta un dato", "Primero elige cuántas camas necesita.");
      return;
    }

    setBuscando(true);
    limpiarBusqueda();
    try {
      const fechaSalidaBusqueda = esPorHoras
        ? formatearFecha(sumarDias(fechaEntradaDate, 1))
        : fechaSalida;

      const datos = await api.buscarHabitacionesPorCapacidad({
        fechaEntrada,
        fechaSalida: fechaSalidaBusqueda,
        personas,
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
        }. No se puede usar para este walk-in.`
      );
      return;
    }

    if (habitacion.estado === "RESERVADA_PENDIENTE") {
      Alert.alert(
        "Habitación reservada, sin pagar",
        `Hab. ${habitacion.numero} tiene una reserva pendiente de pago${
          habitacion.reserva?.cliente ? ` a nombre de ${habitacion.reserva.cliente}` : ""
        }. Si quieres usarla para este walk-in, primero cancela esa reserva desde "Cancelar reserva".`
      );
      return;
    }

    setHabitacionId(habitacion.id);
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
    if (modo === "ocupar" && !metodoPago) {
      Alert.alert("Falta el método de pago", "Elige cómo va a pagar: efectivo, transferencia o tarjeta.");
      return;
    }

    setCreando(true);
    try {
      await api.crearWalkIn({
        nombre,
        telefono,
        documento,
        fechaEntrada,
        fechaSalida,
        personas: Number(personas),
        habitacionId,
        metodoPago,
        tipoEstadia: esPorHoras ? "3_HORAS" : "NOCHE",
        modo: modo === "reservar" ? "RESERVAR" : "OCUPAR",
      });
      Alert.alert(
        "Listo",
        modo === "reservar"
          ? "La reserva quedó apartada, sin cobrar todavía. El huésped paga y hace check-in normal desde Entrada el día que llegue."
          : "La habitación quedó ocupada correctamente.",
        [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("No se pudo crear", err.message);
    } finally {
      setCreando(false);
    }
  }

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido}>
      <Text style={styles.etiqueta}>¿Qué quieres hacer?</Text>
      <View style={styles.filaChips}>
        <TouchableOpacity
          style={[styles.chip, modo === "ocupar" && styles.chipSeleccionado]}
          onPress={() => {
            setModo("ocupar");
          }}
        >
          <Text style={[styles.chipTexto, modo === "ocupar" && styles.chipTextoSeleccionado]}>
            🚪 Ocupar ahora
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, modo === "reservar" && styles.chipSeleccionado]}
          onPress={() => {
            setModo("reservar");
            // Una estadía de 3 horas no aplica para "solo reservar" —
            // siempre ocupa de inmediato.
            if (esPorHoras) setTipoEstadia("noche");
          }}
        >
          <Text style={[styles.chipTexto, modo === "reservar" && styles.chipTextoSeleccionado]}>
            📋 Solo reservar
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.fechaLegible}>
        {modo === "ocupar"
          ? "El huésped ya está aquí — la habitación queda ocupada de una vez."
          : "Aparta la habitación para una fecha (puede ser hoy o después), SIN cobrar nada todavía — paga y hace check-in normal el día que llegue."}
      </Text>

      <Text style={styles.etiqueta}>Nombre completo</Text>
      <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Juan Pérez" />

      <Text style={styles.etiqueta}>Teléfono</Text>
      <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" placeholder="99999999" />

      <Text style={styles.etiqueta}>Número de identidad (DNI)</Text>
      <TextInput style={styles.input} value={documento} onChangeText={setDocumento} keyboardType="number-pad" placeholder="0801199912345" />

      {modo === "ocupar" && (
        <>
          <Text style={styles.etiqueta}>Tipo de estadía</Text>
          <View style={styles.filaChips}>
            <TouchableOpacity
              style={[styles.chip, tipoEstadia === "noche" && styles.chipSeleccionado]}
              onPress={() => elegirTipoEstadia("noche")}
            >
              <Text style={[styles.chipTexto, tipoEstadia === "noche" && styles.chipTextoSeleccionado]}>
                Noche completa
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, tipoEstadia === "3horas" && styles.chipSeleccionado]}
              onPress={() => elegirTipoEstadia("3horas")}
            >
              <Text style={[styles.chipTexto, tipoEstadia === "3horas" && styles.chipTextoSeleccionado]}>
                3 horas (L. 350)
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {esPorHoras ? (
        <>
          <Text style={styles.etiqueta}>Entrada</Text>
          <Text style={styles.fechaLegible}>
            Ahora mismo — {formatearFechaLegible(fechaEntradaDate)}, sale 3 horas después
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.etiqueta}>Entrada</Text>
          <View style={styles.filaChips}>
            <TouchableOpacity
              style={styles.chip}
              onPress={() => setCalendarioVisible(true)}
            >
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
          <Text style={styles.fechaLegible}>
            Sale el {formatearFechaLegible(fechaSalidaDate)}
          </Text>
        </>
      )}

      <Text style={styles.etiqueta}>Camas</Text>
      <View style={styles.filaChips}>
        {[1, 2, 3].map((cantidad) => (
          <TouchableOpacity
            key={cantidad}
            style={[styles.chip, personas === cantidad && styles.chipSeleccionado]}
            onPress={() => elegirPersonas(cantidad)}
          >
            <Text
              style={[styles.chipTexto, personas === cantidad && styles.chipTextoSeleccionado]}
            >
              {cantidad}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.botonBuscar} onPress={buscarHabitaciones} disabled={buscando}>
        {buscando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonBuscarTexto}>Buscar habitaciones</Text>
        )}
      </TouchableOpacity>

      {habitaciones && (
        <View style={styles.bloqueHabitaciones}>
          <Text style={styles.etiqueta}>Elige la habitación</Text>
          <Text style={styles.leyenda}>
            🟩 Libre &nbsp; 🟨 Reservada, sin pagar &nbsp; 🟥 Ocupada
          </Text>
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
                  <Text style={[styles.habitacionChipTexto, { color: colores.texto }]}>
                    Hab. {h.numero}
                  </Text>
                  <Text style={[styles.habitacionChipSub, { color: colores.texto }]}>
                    cap. {h.capacidad}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {habitaciones.length === 0 && (
            <Text style={styles.vacio}>No hay habitaciones con esa capacidad.</Text>
          )}
        </View>
      )}

      {modo === "ocupar" && (
        <>
          <Text style={styles.etiqueta}>Método de pago</Text>
          <View style={styles.filaChips}>
            {METODOS_PAGO.map((metodo) => (
              <TouchableOpacity
                key={metodo.valor}
                style={[styles.chip, metodoPago === metodo.valor && styles.chipSeleccionado]}
                onPress={() => setMetodoPago(metodo.valor)}
              >
                <Text
                  style={[
                    styles.chipTexto,
                    metodoPago === metodo.valor && styles.chipTextoSeleccionado,
                  ]}
                >
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
          (!habitacionId || (modo === "ocupar" && !metodoPago) || creando) && styles.botonDeshabilitado,
        ]}
        onPress={crear}
        disabled={!habitacionId || (modo === "ocupar" && !metodoPago) || creando}
      >
        {creando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonBuscarTexto}>
            {modo === "reservar" ? "Reservar" : "Ocupar habitación"}
          </Text>
        )}
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
  etiqueta: { fontSize: 13, fontWeight: "600", color: "#475569", marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
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
  chipTexto: { color: "#334155", fontSize: 14, fontWeight: "600" },
  chipTextoSeleccionado: { color: "#fff" },
  filaContador: { flexDirection: "row", alignItems: "center", gap: 16 },
  botonContador: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  botonContadorTexto: { fontSize: 20, fontWeight: "700", color: "#334155" },
  contadorNumero: { fontSize: 18, fontWeight: "700", color: "#1e293b", minWidth: 24, textAlign: "center" },
  botonBuscar: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 22,
  },
  botonBuscarTexto: { color: "#fff", fontWeight: "700" },
  bloqueHabitaciones: { marginTop: 6 },
  leyenda: { fontSize: 12, color: "#64748b", marginBottom: 8 },
  vacio: { color: "#94a3b8", fontSize: 13, marginTop: 6 },
  habitacionChip: {
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 76,
  },
  habitacionChipSeleccionada: { borderWidth: 3 },
  habitacionChipTexto: { fontWeight: "700", fontSize: 14 },
  habitacionChipSub: { fontSize: 11, marginTop: 2 },
  botonCrear: {
    backgroundColor: "#16a34a",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 26,
  },
  botonDeshabilitado: { opacity: 0.5 },
});