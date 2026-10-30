import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { api } from "../api/client";
import { esEstadiaPorHoras, textoHorario } from "../utils/estadia";

const COLOR_ESTADO = {
  PENDIENTE_PAGO: "#f59e0b",
  CONFIRMADA: "#2563eb",
  CHECK_IN: "#ef4444",
};

const TEXTO_ESTADO = {
  PENDIENTE_PAGO: "Pendiente de pago",
  CONFIRMADA: "Confirmada",
  CHECK_IN: "Hospedado ahora",
};

function formatearFecha(fechaISO) {
  return new Date(fechaISO).toLocaleDateString("es-HN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function MoverHabitacionScreen() {
  const [reservas, setReservas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const [habitacionesLibres, setHabitacionesLibres] = useState(null);
  const [buscandoLibres, setBuscandoLibres] = useState(false);
  const [moviendo, setMoviendo] = useState(false);
  const [habitacionEligiendo, setHabitacionEligiendo] = useState(null);

  const cargarReservas = useCallback(async () => {
    try {
      const datos = await api.obtenerReservasActivasParaMover();
      setReservas(datos);
    } catch (err) {
      Alert.alert("Error al cargar", err.message);
    }
  }, []);

  useEffect(() => {
    cargarReservas().finally(() => setCargando(false));
  }, [cargarReservas]);

  async function onRefresh() {
    setRefrescando(true);
    await cargarReservas();
    setRefrescando(false);
  }

  async function elegirReserva(reserva) {
    setReservaSeleccionada(reserva);
    setHabitacionesLibres(null);
    setBuscandoLibres(true);
    try {
      const libres = await api.obtenerHabitacionesLibresParaMover(reserva.id);
      setHabitacionesLibres(libres);
    } catch (err) {
      Alert.alert("Error buscando habitaciones libres", err.message);
    } finally {
      setBuscandoLibres(false);
    }
  }

  function cancelarSeleccion() {
    setReservaSeleccionada(null);
    setHabitacionesLibres(null);
  }

  function confirmarMover(habitacionDestino) {
    setHabitacionEligiendo(habitacionDestino.id);
    Alert.alert(
      `¿Mover a Hab. ${habitacionDestino.numero}?`,
      `${reservaSeleccionada.cliente} pasará de la Habitación ${reservaSeleccionada.habitacionActual} a la Habitación ${habitacionDestino.numero}.`,
      [
        { text: "Cancelar", style: "cancel", onPress: () => setHabitacionEligiendo(null) },
        {
          text: "Sí, mover",
          onPress: async () => {
            setMoviendo(true);
            try {
              await api.moverHabitacion(reservaSeleccionada.id, habitacionDestino.id);
              Alert.alert(
                "✅ Listo",
                `${reservaSeleccionada.cliente} ahora está en la Habitación ${habitacionDestino.numero}.`
              );
              cancelarSeleccion();
              await cargarReservas();
            } catch (err) {
              Alert.alert("No se pudo mover", err.message);
            } finally {
              setMoviendo(false);
              setHabitacionEligiendo(null);
            }
          },
        },
      ]
    );
  }

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // ───────────── Paso 2: elegir la habitación de destino ─────────────
  if (reservaSeleccionada) {
    return (
      <View style={styles.contenedor}>
        <View style={styles.encabezadoMover}>
          <TouchableOpacity onPress={cancelarSeleccion} style={styles.botonAtras} hitSlop={12}>
            <Text style={styles.botonAtrasTexto}>‹ Atrás</Text>
          </TouchableOpacity>

          <View style={styles.filaDesdeHacia}>
            <View style={styles.burbujaOrigen}>
              <Text style={styles.burbujaOrigenNumero}>{reservaSeleccionada.habitacionActual}</Text>
            </View>
            <Text style={styles.flechaGrande}>→</Text>
            <View style={styles.burbujaDestinoVacia}>
              <Text style={styles.burbujaDestinoSigno}>?</Text>
            </View>
          </View>

          <Text style={styles.nombreClienteGrande}>{reservaSeleccionada.cliente}</Text>
          <Text style={styles.subFechas}>
            {formatearFecha(reservaSeleccionada.fechaEntrada)} — {formatearFecha(reservaSeleccionada.fechaSalida)}
          </Text>
          {esEstadiaPorHoras(reservaSeleccionada) && (
            <Text style={styles.horario}>⏱ {textoHorario(reservaSeleccionada)}</Text>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.contenidoPaso2}>
          <Text style={styles.etiquetaPaso}>Toca la habitación a la que se va a mover</Text>

          {buscandoLibres ? (
            <ActivityIndicator style={{ marginTop: 30 }} color="#2563eb" />
          ) : habitacionesLibres?.length === 0 ? (
            <View style={styles.vacioBox}>
              <Text style={styles.vacioEmoji}>🚫</Text>
              <Text style={styles.vacioTexto}>
                No hay ninguna otra habitación libre para esas mismas fechas.
              </Text>
            </View>
          ) : (
            <View style={styles.gridHabitaciones}>
              {habitacionesLibres?.map((h) => (
                <TouchableOpacity
                  key={h.id}
                  style={[
                    styles.habitacionDestino,
                    habitacionEligiendo === h.id && styles.habitacionDestinoActiva,
                  ]}
                  onPress={() => confirmarMover(h)}
                  disabled={moviendo}
                  activeOpacity={0.7}
                >
                  <Text style={styles.habitacionDestinoNumero}>{h.numero}</Text>
                  <Text style={styles.habitacionDestinoCap}>
                    {h.capacidad} {h.capacidad === 1 ? "persona" : "personas"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ───────────── Paso 1: elegir cuál reserva mover ─────────────
  return (
    <ScrollView
      style={styles.contenedor}
      contentContainerStyle={styles.contenido}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
    >
      <Text style={styles.leyenda}>Toca la reserva que quieres mover a otra habitación</Text>

      {reservas?.length === 0 && (
        <View style={styles.vacioBox}>
          <Text style={styles.vacioEmoji}>🏨</Text>
          <Text style={styles.vacioTexto}>No hay reservas activas en este momento.</Text>
        </View>
      )}

      {reservas?.map((reserva) => {
        const color = COLOR_ESTADO[reserva.estado] || "#6b7280";

        return (
          <TouchableOpacity
            key={reserva.id}
            style={[styles.tarjeta, { borderLeftColor: color }]}
            onPress={() => elegirReserva(reserva)}
            activeOpacity={0.7}
          >
            <View style={styles.filaTarjeta}>
              <View style={styles.circuloNumero}>
                <Text style={styles.circuloNumeroTexto}>{reserva.habitacionActual}</Text>
              </View>

              <View style={styles.infoTarjeta}>
                <Text style={styles.cliente}>{reserva.cliente}</Text>
                <Text style={styles.detalle}>
                  {formatearFecha(reserva.fechaEntrada)} → {formatearFecha(reserva.fechaSalida)}
                </Text>
                {esEstadiaPorHoras(reserva) && (
                  <Text style={styles.horario}>⏱ {textoHorario(reserva)}</Text>
                )}
                <View style={[styles.badgeEstado, { backgroundColor: color }]}>
                  <Text style={styles.badgeEstadoTexto}>{TEXTO_ESTADO[reserva.estado] || reserva.estado}</Text>
                </View>
              </View>

              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  contenido: { padding: 16, paddingBottom: 40 },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center" },
  leyenda: { fontSize: 13, color: "#64748b", marginBottom: 14 },

  vacioBox: { alignItems: "center", marginTop: 40, paddingHorizontal: 30 },
  vacioEmoji: { fontSize: 40, marginBottom: 10 },
  vacioTexto: { color: "#94a3b8", fontSize: 14, textAlign: "center" },

  tarjeta: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  filaTarjeta: { flexDirection: "row", alignItems: "center" },
  circuloNumero: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  circuloNumeroTexto: { fontSize: 17, fontWeight: "700", color: "#334155" },
  infoTarjeta: { flex: 1 },
  cliente: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  detalle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  horario: { fontSize: 13, color: "#b45309", fontWeight: "700", marginTop: 3 },
  badgeEstado: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 6,
  },
  badgeEstadoTexto: { color: "#fff", fontSize: 11, fontWeight: "700" },
  chevron: { fontSize: 26, color: "#cbd5e1", marginLeft: 6 },

  encabezadoMover: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  botonAtras: { alignSelf: "flex-start" },
  botonAtrasTexto: { color: "#2563eb", fontSize: 15, fontWeight: "600" },
  filaDesdeHacia: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 14 },
  burbujaOrigen: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#cbd5e1",
  },
  burbujaOrigenNumero: { fontSize: 22, fontWeight: "700", color: "#475569" },
  flechaGrande: { fontSize: 26, color: "#94a3b8" },
  burbujaDestinoVacia: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#93c5fd",
    borderStyle: "dashed",
  },
  burbujaDestinoSigno: { fontSize: 24, fontWeight: "700", color: "#3b82f6" },
  nombreClienteGrande: { fontSize: 17, fontWeight: "700", color: "#1e293b", marginTop: 14 },
  subFechas: { fontSize: 13, color: "#64748b", marginTop: 2 },

  contenidoPaso2: { padding: 16, paddingBottom: 40 },
  etiquetaPaso: { fontSize: 14, fontWeight: "600", color: "#334155", marginBottom: 14, textAlign: "center" },

  gridHabitaciones: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  habitacionDestino: {
    width: 92,
    height: 92,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#22c55e",
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  habitacionDestinoActiva: { backgroundColor: "#dcfce7", borderColor: "#16a34a" },
  habitacionDestinoNumero: { fontSize: 26, fontWeight: "700", color: "#166534" },
  habitacionDestinoCap: { fontSize: 11, color: "#166534", marginTop: 4 },
});