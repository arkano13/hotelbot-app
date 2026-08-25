import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";

const METODOS_PAGO = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "transferencia", etiqueta: "Transferencia" },
  { valor: "tarjeta", etiqueta: "Tarjeta" },
];

export default function CheckInScreen() {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);
  const [procesandoId, setProcesandoId] = useState(null);

  const [reservaParaConfirmar, setReservaParaConfirmar] = useState(null);
  const [metodoElegido, setMetodoElegido] = useState(null);
  const [habitacionElegidaId, setHabitacionElegidaId] = useState(null);
  const [alternativas, setAlternativas] = useState(null);
  const [cargandoAlternativas, setCargandoAlternativas] = useState(false);

  const cargar = useCallback(async (mostrarSpinner = true) => {
    if (mostrarSpinner) setCargando(true);
    setError(null);
    try {
      const datos = await api.obtenerReservasParaCheckIn();
      setReservas(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function abrirConfirmacion(reserva) {
    setReservaParaConfirmar(reserva);
    setMetodoElegido(reserva.estado === "PENDIENTE_PAGO" ? null : "ya_pagado");
    setHabitacionElegidaId(reserva.habitacionId);
    setAlternativas(null);
    setCargandoAlternativas(true);

    try {
      const datos = await api.obtenerAlternativasCheckIn(reserva.habitacionId);
      setAlternativas(datos);
    } catch (err) {
      // Si falla, no es grave — simplemente no se ofrece cambiar de
      // habitación, se sigue con la que ya tenía.
      setAlternativas([]);
    } finally {
      setCargandoAlternativas(false);
    }
  }

  async function confirmarLlegada() {
    if (!reservaParaConfirmar) return;

    const necesitaMetodo = reservaParaConfirmar.estado === "PENDIENTE_PAGO";
    if (necesitaMetodo && !metodoElegido) {
      Alert.alert("Falta un dato", "Elige cómo pagó: efectivo, transferencia o tarjeta.");
      return;
    }

    setProcesandoId(reservaParaConfirmar.habitacionId);
    try {
      await api.hacerCheckIn(
        reservaParaConfirmar.habitacionId,
        necesitaMetodo ? metodoElegido : null,
        habitacionElegidaId !== reservaParaConfirmar.habitacionId ? habitacionElegidaId : null
      );
      setReservaParaConfirmar(null);
      await cargar(false);
    } catch (err) {
      Alert.alert("No se pudo confirmar", err.message);
    } finally {
      setProcesandoId(null);
    }
  }

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      {error && (
        <TouchableOpacity style={styles.errorBox} onPress={() => cargar()}>
          <Text style={styles.errorTexto}>{error} — toca para reintentar</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={reservas}
        keyExtractor={(item) => item.habitacionId}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => {
              setRefrescando(true);
              cargar(false);
            }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.vacio}>No hay huéspedes esperando entrada hoy.</Text>
        }
        renderItem={({ item }) => {
          const procesando = procesandoId === item.habitacionId;
          const pagada = item.estado !== "PENDIENTE_PAGO";

          return (
            <View style={styles.tarjeta}>
              <Text style={styles.habitacion}>Hab. {item.habitacion.numero}</Text>
              <Text style={styles.cliente}>{item.cliente.nombre}</Text>
              <Text style={styles.detalle}>Código: {item.codigo}</Text>
              <Text
                style={[
                  styles.estadoPago,
                  { color: pagada ? "#16a34a" : "#b45309" },
                ]}
              >
                {pagada ? "Ya pagó" : "Aún no ha pagado"}
              </Text>

              <TouchableOpacity
                style={[styles.boton, procesando && styles.botonDeshabilitado]}
                disabled={procesando}
                onPress={() => abrirConfirmacion(item)}
              >
                {procesando ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.botonTexto}>Llegó</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <Modal visible={!!reservaParaConfirmar} transparent animationType="fade">
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <Text style={styles.modalTitulo}>Confirmar llegada</Text>
            <Text style={styles.modalSubtitulo}>
              {reservaParaConfirmar
                ? `${reservaParaConfirmar.cliente.nombre} · Hab. ${reservaParaConfirmar.habitacion.numero}`
                : ""}
            </Text>

            {reservaParaConfirmar?.estado === "PENDIENTE_PAGO" && (
              <>
                <Text style={styles.seccionTitulo}>¿Cómo pagó?</Text>
                <View style={styles.filaChips}>
                  {METODOS_PAGO.map((metodo) => (
                    <TouchableOpacity
                      key={metodo.valor}
                      style={[
                        styles.chip,
                        metodoElegido === metodo.valor && styles.chipSeleccionado,
                      ]}
                      onPress={() => setMetodoElegido(metodo.valor)}
                    >
                      <Text
                        style={[
                          styles.chipTexto,
                          metodoElegido === metodo.valor && styles.chipTextoSeleccionado,
                        ]}
                      >
                        {metodo.etiqueta}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.seccionTitulo}>¿A qué habitación le dieron?</Text>
            {cargandoAlternativas ? (
              <ActivityIndicator style={{ marginVertical: 10 }} />
            ) : (
              <View style={styles.filaChips}>
                {(alternativas ?? []).map((hab) => (
                  <TouchableOpacity
                    key={hab.id}
                    style={[
                      styles.chip,
                      habitacionElegidaId === hab.id && styles.chipSeleccionado,
                    ]}
                    onPress={() => setHabitacionElegidaId(hab.id)}
                  >
                    <Text
                      style={[
                        styles.chipTexto,
                        habitacionElegidaId === hab.id && styles.chipTextoSeleccionado,
                      ]}
                    >
                      Hab. {hab.numero}{hab.esLaOriginal ? " (la que reservó)" : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.filaBotonesFinal}>
              <TouchableOpacity
                style={styles.botonCancelarModal}
                onPress={() => setReservaParaConfirmar(null)}
              >
                <Text style={styles.botonCancelarModalTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.botonConfirmar}
                onPress={confirmarLlegada}
                disabled={procesandoId !== null}
              >
                {procesandoId !== null ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.botonConfirmarTexto}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center" },
  lista: { padding: 12 },
  vacio: { textAlign: "center", color: "#94a3b8", marginTop: 40, fontSize: 15 },
  tarjeta: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  habitacion: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  cliente: { fontSize: 15, color: "#334155", marginTop: 2 },
  detalle: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  estadoPago: { fontSize: 13, fontWeight: "700", marginTop: 6 },
  boton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#16a34a",
  },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { color: "#fff", fontWeight: "700" },
  errorBox: {
    backgroundColor: "#fee2e2",
    padding: 10,
    margin: 12,
    borderRadius: 8,
  },
  errorTexto: { color: "#991b1b", textAlign: "center" },
  modalFondo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCaja: { backgroundColor: "#fff", borderRadius: 14, padding: 20, maxHeight: "85%" },
  modalTitulo: { fontSize: 17, fontWeight: "700", color: "#1e293b" },
  modalSubtitulo: { fontSize: 13, color: "#64748b", marginTop: 4, marginBottom: 10 },
  seccionTitulo: { fontSize: 13, fontWeight: "600", color: "#475569", marginTop: 12, marginBottom: 6 },
  filaChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSeleccionado: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipTexto: { color: "#334155", fontSize: 13, fontWeight: "600" },
  chipTextoSeleccionado: { color: "#fff" },
  filaBotonesFinal: { flexDirection: "row", gap: 10, marginTop: 20 },
  botonCancelarModal: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  botonCancelarModalTexto: { color: "#334155", fontWeight: "700" },
  botonConfirmar: {
    flex: 1,
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  botonConfirmarTexto: { color: "#fff", fontWeight: "700" },
});