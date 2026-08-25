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

export default function MantenimientoScreen() {
  const [habitaciones, setHabitaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async (mostrarSpinner = true) => {
    if (mostrarSpinner) setCargando(true);
    setError(null);
    try {
      const datos = await api.obtenerHabitacionesMantenimiento();
      setHabitaciones(datos);
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

  async function alternar(habitacion) {
    const activando = habitacion.estado !== "MANTENIMIENTO";
    setProcesandoId(habitacion.id);
    try {
      await api.alternarMantenimiento(habitacion.id);
      await cargar(false);
    } catch (err) {
      Alert.alert(
        activando ? "No se pudo poner en mantenimiento" : "No se pudo quitar de mantenimiento",
        err.message
      );
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
        data={habitaciones}
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
        renderItem={({ item }) => {
          const enMantenimiento = item.estado === "MANTENIMIENTO";
          const procesando = procesandoId === item.id;

          return (
            <View style={styles.tarjeta}>
              <View>
                <Text style={styles.habitacion}>Hab. {item.numero}</Text>
                <Text style={styles.estado}>
                  {enMantenimiento ? "En mantenimiento" : "Disponible"}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.boton,
                  { backgroundColor: enMantenimiento ? "#16a34a" : "#6b7280" },
                  procesando && styles.botonDeshabilitado,
                ]}
                disabled={procesando}
                onPress={() => alternar(item)}
              >
                {procesando ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.botonTexto}>
                    {enMantenimiento ? "Quitar" : "Poner en mant."}
                  </Text>
                )}
              </TouchableOpacity>
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
  tarjeta: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  habitacion: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  estado: { fontSize: 13, color: "#64748b", marginTop: 2 },
  boton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
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