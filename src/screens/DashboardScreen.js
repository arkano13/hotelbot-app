import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";

const COLORES_ESTADO = {
  LIBRE: "#22c55e",
  OCUPADA: "#ef4444",
  RESERVADA: "#f59e0b",
  MANTENIMIENTO: "#6b7280",
};

const TEXTO_ESTADO = {
  LIBRE: "Libre",
  OCUPADA: "Ocupada",
  RESERVADA: "Reservada",
  MANTENIMIENTO: "Mantenimiento",
};

function formatearFechaCorta(fechaISO) {
  if (!fechaISO) return "";
  return new Date(fechaISO).toLocaleDateString("es-HN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function TarjetaHabitacion({ habitacion, onEditar }) {
  const color = COLORES_ESTADO[habitacion.estado] || "#6b7280";

  return (
    <View style={[styles.tarjeta, { borderLeftColor: color }]}>
      <View style={styles.filaTitulo}>
        <Text style={styles.numero}>Hab. {habitacion.numero}</Text>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeTexto}>
            {TEXTO_ESTADO[habitacion.estado] || habitacion.estado}
          </Text>
        </View>
      </View>

      <Text style={styles.capacidad}>Capacidad: {habitacion.capacidad}</Text>

      {habitacion.reserva && (
        <View style={styles.infoReserva}>
          <Text style={styles.cliente}>{habitacion.reserva.cliente}</Text>
          <Text style={styles.detalle}>
            Sale: {formatearFechaCorta(habitacion.reserva.fechaSalida)}
          </Text>
          <Text style={styles.detalle}>
            {habitacion.reserva.metodoPago === "EFECTIVO"
              ? "Paga en efectivo"
              : `Pago: ${habitacion.reserva.estadoPago || "pendiente"}`}
          </Text>
          <TouchableOpacity style={styles.botonEditar} onPress={onEditar}>
            <Text style={styles.botonEditarTexto}>✏️ Editar reserva</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const [habitaciones, setHabitaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);

  const [botActivo, setBotActivo] = useState(true);
  const [cambiandoBot, setCambiandoBot] = useState(false);

  const cargar = useCallback(async (mostrarSpinner = true) => {
    if (mostrarSpinner) setCargando(true);
    setError(null);
    try {
      const [datosHabitaciones, datosBot] = await Promise.all([
        api.obtenerHabitaciones(),
        api.obtenerEstadoBot(),
      ]);
      setHabitaciones(datosHabitaciones);
      setBotActivo(datosBot.activo);
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

  async function alternarBot(nuevoValor) {
    if (!nuevoValor) {
      Alert.alert(
        "¿Apagar el bot?",
        "Ningún cliente va a recibir respuesta automática hasta que lo vuelvas a encender.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Sí, apagar",
            style: "destructive",
            onPress: () => cambiarBot(false),
          },
        ]
      );
      return;
    }

    cambiarBot(true);
  }

  async function cambiarBot(valor) {
    setCambiandoBot(true);
    try {
      const resultado = await api.cambiarEstadoBot(valor);
      setBotActivo(resultado.activo);
    } catch (err) {
      Alert.alert("No se pudo cambiar", err.message);
    } finally {
      setCambiandoBot(false);
    }
  }

  const resumen = habitaciones.reduce(
    (acc, h) => {
      acc[h.estado] = (acc[h.estado] || 0) + 1;
      return acc;
    },
    { LIBRE: 0, OCUPADA: 0, RESERVADA: 0, MANTENIMIENTO: 0 }
  );

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <View
        style={[
          styles.barraBot,
          { backgroundColor: botActivo ? "#dcfce7" : "#fee2e2" },
        ]}
      >
        <View style={styles.barraBotTextos}>
          <Text
            style={[
              styles.barraBotTitulo,
              { color: botActivo ? "#166534" : "#991b1b" },
            ]}
          >
            {botActivo ? "🤖 Bot encendido" : "🔌 Bot apagado"}
          </Text>
          <Text style={styles.barraBotSubtitulo}>
            {botActivo
              ? "Respondiendo a los clientes automáticamente"
              : "Nadie recibe respuesta automática ahorita"}
          </Text>
        </View>
        {cambiandoBot ? (
          <ActivityIndicator color={botActivo ? "#166534" : "#991b1b"} />
        ) : (
          <Switch value={botActivo} onValueChange={alternarBot} />
        )}
      </View>

      <View style={styles.resumen}>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNumero, { color: COLORES_ESTADO.LIBRE }]}>
            {resumen.LIBRE}
          </Text>
          <Text style={styles.resumenTexto}>Libres</Text>
        </View>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNumero, { color: COLORES_ESTADO.OCUPADA }]}>
            {resumen.OCUPADA}
          </Text>
          <Text style={styles.resumenTexto}>Ocupadas</Text>
        </View>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNumero, { color: COLORES_ESTADO.RESERVADA }]}>
            {resumen.RESERVADA}
          </Text>
          <Text style={styles.resumenTexto}>Reservadas</Text>
        </View>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenNumero, { color: COLORES_ESTADO.MANTENIMIENTO }]}>
            {resumen.MANTENIMIENTO}
          </Text>
          <Text style={styles.resumenTexto}>Mant.</Text>
        </View>
      </View>

      {error && (
        <TouchableOpacity style={styles.errorBox} onPress={() => cargar()}>
          <Text style={styles.errorTexto}>{error} — toca para reintentar</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={habitaciones}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TarjetaHabitacion
            habitacion={item}
            onEditar={() =>
              navigation.navigate("EditarReservas", {
                habitacionNumero: item.numero,
              })
            }
          />
        )}
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
      />

    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center" },
  barraBot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    margin: 12,
    marginBottom: 0,
    borderRadius: 12,
  },
  barraBotTextos: { flex: 1, marginRight: 10 },
  barraBotTitulo: { fontSize: 15, fontWeight: "700" },
  barraBotSubtitulo: { fontSize: 12, color: "#475569", marginTop: 2 },
  resumen: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  resumenItem: { alignItems: "center" },
  resumenNumero: { fontSize: 24, fontWeight: "700" },
  resumenTexto: { fontSize: 12, color: "#64748b", marginTop: 2 },
  lista: { padding: 12 },
  tarjeta: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  filaTitulo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  numero: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeTexto: { color: "#fff", fontSize: 12, fontWeight: "600" },
  capacidad: { color: "#64748b", marginTop: 4, fontSize: 13 },
  infoReserva: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  cliente: { fontWeight: "600", color: "#334155" },
  detalle: { color: "#64748b", fontSize: 12, marginTop: 2 },
  botonEditar: {
    alignSelf: "flex-start",
    backgroundColor: "#ede9fe",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  botonEditarTexto: { color: "#6d28d9", fontWeight: "700", fontSize: 12 },
  errorBox: {
    backgroundColor: "#fee2e2",
    padding: 10,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 8,
  },
  errorTexto: { color: "#991b1b", textAlign: "center" },
});
