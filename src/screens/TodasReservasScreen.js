import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../api/client";

const ESTADOS = {
  PENDIENTE_PAGO: ["Pendiente de pago", "#d97706"],
  CONFIRMADA: ["Confirmada", "#2563eb"],
};

const ESTADOS_PENDIENTES_ENTRADA = new Set(["PENDIENTE_PAGO", "CONFIRMADA"]);

function fechaEntrada(valor) {
  return new Date(valor).toLocaleString("es-HN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fechaSalida(valor) {
  return new Date(valor).toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "short",
  });
}

export default function TodasReservasScreen() {
  const [reservas, setReservas] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setReservas(await api.obtenerTodasLasReservas());
    } catch (error) {
      Alert.alert("Error al cargar", error.message);
    }
  }, []);

  useEffect(() => {
    cargar().finally(() => setCargando(false));
  }, [cargar]);

  const filtradas = useMemo(() => {
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    const texto = busqueda.trim().toLowerCase();
    return (reservas || []).filter((reserva) => {
      const esDeHoyEnAdelante = new Date(reserva.fechaEntrada) >= inicioHoy;
      const faltaDarEntrada = ESTADOS_PENDIENTES_ENTRADA.has(reserva.estado);
      if (!esDeHoyEnAdelante || !faltaDarEntrada) return false;
      if (!texto) return true;
      return [
          reserva.codigo,
          reserva.cliente?.nombre,
          reserva.cliente?.telefono,
          reserva.habitacion?.numero,
          reserva.estado,
        ].some((valor) => String(valor ?? "").toLowerCase().includes(texto));
    });
  }, [busqueda, reservas]);

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  if (cargando) {
    return <View style={styles.centrado}><ActivityIndicator size="large" color="#0f766e" /></View>;
  }

  return (
    <ScrollView
      style={styles.contenedor}
      contentContainerStyle={styles.contenido}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}
      keyboardShouldPersistTaps="handled"
    >
      <TextInput
        style={styles.buscar}
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar nombre, código, teléfono o habitación"
      />
      <Text style={styles.ayuda}>Reservaciones de hoy en adelante que todavía esperan entrada.</Text>
      <Text style={styles.contador}>{filtradas.length} reservación(es)</Text>

      {filtradas.length === 0 && <Text style={styles.vacio}>No se encontraron reservaciones.</Text>}
      {filtradas.map((reserva) => {
        const [estadoTexto, color] = ESTADOS[reserva.estado] || [reserva.estado, "#64748b"];
        return (
          <View key={reserva.id} style={[styles.tarjeta, { borderLeftColor: color }]}>
            <View style={styles.filaSuperior}>
              <View style={styles.info}>
                <Text style={styles.nombre}>{reserva.cliente?.nombre || "Sin nombre"}</Text>
                <Text style={styles.codigo}>{reserva.codigo}</Text>
              </View>
              <View style={[styles.estado, { backgroundColor: color }]}>
                <Text style={styles.estadoTexto}>{estadoTexto}</Text>
              </View>
            </View>
            <View style={styles.datosReserva}>
              <View style={styles.datoFila}>
                <Text style={styles.datoEtiqueta}>Habitación</Text>
                <Text style={styles.datoValor}>{reserva.habitacion?.numero || "—"}</Text>
              </View>
              <View style={styles.datoFila}>
                <Text style={styles.datoEtiqueta}>Entrada</Text>
                <Text style={styles.datoValor}>{fechaEntrada(reserva.fechaEntrada)}</Text>
              </View>
              <View style={styles.datoFila}>
                <Text style={styles.datoEtiqueta}>Salida</Text>
                <Text style={styles.datoValor}>{fechaSalida(reserva.fechaSalida)}</Text>
              </View>
            </View>
            <View style={styles.pieTarjeta}>
              <Text style={styles.precio}>L {Number(reserva.precioTotal).toFixed(2)}</Text>
              <Text style={styles.pago}>
                {reserva.pago?.estado || "Sin pago"}
                {reserva.pago?.proveedor ? ` · ${reserva.pago.proveedor}` : ""}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  contenido: { padding: 16, paddingBottom: 40 },
  centrado: { flex: 1, alignItems: "center", justifyContent: "center" },
  buscar: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, padding: 12, fontSize: 14 },
  ayuda: { color: "#64748b", fontSize: 12, marginTop: 9 },
  contador: { color: "#64748b", fontSize: 12, marginVertical: 10 },
  tarjeta: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 11, borderLeftWidth: 5 },
  filaSuperior: { flexDirection: "row", alignItems: "flex-start" },
  info: { flex: 1 },
  nombre: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  codigo: { fontSize: 12, color: "#64748b", marginTop: 2 },
  estado: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginLeft: 8 },
  estadoTexto: { color: "#fff", fontSize: 10, fontWeight: "700" },
  datosReserva: { marginTop: 12, paddingTop: 9, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  datoFila: { flexDirection: "row", justifyContent: "space-between", marginTop: 7 },
  datoEtiqueta: { fontSize: 12, color: "#94a3b8" },
  datoValor: { fontSize: 13, color: "#334155", fontWeight: "600", textAlign: "right" },
  pieTarjeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 13 },
  precio: { fontSize: 17, fontWeight: "800", color: "#0f766e" },
  pago: { fontSize: 11, color: "#64748b", textAlign: "right", flexShrink: 1, marginLeft: 10 },
  vacio: { color: "#94a3b8", textAlign: "center", marginTop: 40 },
});
