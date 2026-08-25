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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";

export default function AprobacionesScreen() {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async (mostrarSpinner = true) => {
    if (mostrarSpinner) setCargando(true);
    setError(null);
    try {
      const datos = await api.obtenerReservasQueRequierenAprobacion();
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

  function confirmarAprobar(reserva) {
    Alert.alert(
      "¿Confirmar esta habitación?",
      `${reserva.cliente.nombre} pidió para ${reserva.cantidadPersonas} — se le va a confirmar la Hab. ${reserva.habitacion.numero} (capacidad ${reserva.habitacion.capacidad}). Se le avisa por WhatsApp automáticamente.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, confirmar",
          onPress: async () => {
            setProcesandoId(reserva.id);
            try {
              await api.aprobarHabitacion(reserva.id);
              await cargar(false);
            } catch (err) {
              Alert.alert("No se pudo aprobar", err.message);
            } finally {
              setProcesandoId(null);
            }
          },
        },
      ]
    );
  }

  function confirmarRechazar(reserva) {
    Alert.alert(
      "¿Rechazar y cancelar esta reserva?",
      `Se le avisa a ${reserva.cliente.nombre} por WhatsApp que no hay disponibilidad. Esto no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, rechazar",
          style: "destructive",
          onPress: async () => {
            setProcesandoId(reserva.id);
            try {
              await api.rechazarHabitacion(reserva.id);
              await cargar(false);
            } catch (err) {
              Alert.alert("No se pudo rechazar", err.message);
            } finally {
              setProcesandoId(null);
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

  return (
    <View style={styles.contenedor}>
      {error && (
        <TouchableOpacity style={styles.errorBox} onPress={() => cargar()}>
          <Text style={styles.errorTexto}>{error} — toca para reintentar</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={reservas}
        keyExtractor={(item) => item.id}
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
          <Text style={styles.vacio}>
            No hay ninguna reserva esperando aprobación ahorita.
          </Text>
        }
        renderItem={({ item }) => {
          const procesando = procesandoId === item.id;

          return (
            <View style={styles.tarjeta}>
              <Text style={styles.codigo}>{item.codigo}</Text>
              <Text style={styles.cliente}>{item.cliente.nombre}</Text>
              <Text style={styles.detalle}>
                Pidió para {item.cantidadPersonas} · se le asignó Hab. {item.habitacion.numero} (capacidad {item.habitacion.capacidad})
              </Text>
              <Text style={styles.detalle}>
                {new Date(item.fechaEntrada).toLocaleDateString("es-HN")} → {new Date(item.fechaSalida).toLocaleDateString("es-HN")}
              </Text>
              <Text style={styles.monto}>L. {Number(item.precioTotal).toFixed(2)}</Text>

              <View style={styles.filaBotones}>
                <TouchableOpacity
                  style={[styles.boton, styles.botonAprobar, procesando && styles.botonDeshabilitado]}
                  disabled={procesando}
                  onPress={() => confirmarAprobar(item)}
                >
                  {procesando ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.botonTexto}>Confirmar habitación</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.boton, styles.botonRechazar, procesando && styles.botonDeshabilitado]}
                  disabled={procesando}
                  onPress={() => confirmarRechazar(item)}
                >
                  <Text style={styles.botonTexto}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
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
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: "#7c3aed",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  codigo: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  cliente: { fontSize: 17, fontWeight: "700", color: "#1e293b", marginTop: 4 },
  detalle: { fontSize: 13, color: "#475569", marginTop: 4 },
  monto: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginTop: 6 },
  filaBotones: { flexDirection: "row", gap: 10, marginTop: 14 },
  boton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  botonAprobar: { backgroundColor: "#16a34a" },
  botonRechazar: { backgroundColor: "#dc2626" },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { color: "#fff", fontWeight: "700", fontSize: 13 },
  errorBox: {
    backgroundColor: "#fee2e2",
    padding: 10,
    margin: 12,
    borderRadius: 8,
  },
  errorTexto: { color: "#991b1b", textAlign: "center" },
});