import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api, API_URL } from "../api/client";

function urlComprobante(comprobanteUrl) {
  if (!comprobanteUrl) return null;

  // Solo aceptamos URLs http(s) completas o rutas relativas que empiecen
  // con "/". Cualquier otra cosa (ej. si BASE_URL quedó mal configurado en
  // el backend y guardó algo como "postgresql://...") se descarta en vez
  // de intentar renderizarla — una URI inválida puede tronar la vista
  // nativa de Image en vez de solo fallar en JS.
  if (/^https?:\/\//i.test(comprobanteUrl)) {
    return comprobanteUrl;
  }

  if (comprobanteUrl.startsWith("/")) {
    return `${API_URL}${comprobanteUrl}`;
  }

  return null;
}

export default function PagosScreen() {
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const [error, setError] = useState(null);
  const [pagoRechazando, setPagoRechazando] = useState(null);
  const [motivo, setMotivo] = useState("");

  const cargar = useCallback(async (mostrarSpinner = true) => {
    if (mostrarSpinner) setCargando(true);
    setError(null);
    try {
      const datos = await api.obtenerPagosPendientes();
      setPagos(datos);
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

  function confirmarAprobar(pago) {
    Alert.alert(
      "¿Aprobar este pago?",
      `${pago.reserva.cliente.nombre} · Hab. ${pago.reserva.habitacion.numero} · L. ${Number(pago.monto).toFixed(2)}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, aprobar",
          onPress: async () => {
            setProcesandoId(pago.id);
            try {
              await api.aprobarPago(pago.codigo);
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

  function abrirRechazo(pago) {
    setMotivo("");
    setPagoRechazando(pago);
  }

  async function confirmarRechazo() {
    if (!pagoRechazando) return;
    setProcesandoId(pagoRechazando.id);
    try {
      await api.rechazarPago(pagoRechazando.codigo, motivo);
      setPagoRechazando(null);
      await cargar(false);
    } catch (err) {
      Alert.alert("No se pudo rechazar", err.message);
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
        data={pagos}
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
          <Text style={styles.vacio}>No hay pagos pendientes de revisar.</Text>
        }
        renderItem={({ item }) => {
          const procesando = procesandoId === item.id;
          const url = urlComprobante(item.comprobanteUrl);

          return (
            <View style={styles.tarjeta}>
              <Text style={styles.habitacion}>
                Hab. {item.reserva.habitacion.numero}
              </Text>
              <Text style={styles.cliente}>{item.reserva.cliente.nombre}</Text>
              <Text style={styles.detalle}>Código: {item.reserva.codigo}</Text>
              <Text style={styles.monto}>L. {Number(item.monto).toFixed(2)}</Text>

              {url ? (
                <Image
                  source={{ uri: url }}
                  style={styles.comprobante}
                  resizeMode="contain"
                />
              ) : item.comprobanteUrl ? (
                <Text style={styles.avisoUrlInvalida}>
                  No se puede mostrar la imagen (URL de comprobante inválida —
                  revisa BASE_URL en el .env del servidor).
                </Text>
              ) : null}

              <View style={styles.filaBotones}>
                <TouchableOpacity
                  style={[styles.boton, styles.botonAprobar, procesando && styles.botonDeshabilitado]}
                  disabled={procesando}
                  onPress={() => confirmarAprobar(item)}
                >
                  {procesando ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.botonTexto}>Aprobar</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.boton, styles.botonRechazar, procesando && styles.botonDeshabilitado]}
                  disabled={procesando}
                  onPress={() => abrirRechazo(item)}
                >
                  <Text style={styles.botonTexto}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={!!pagoRechazando} transparent animationType="fade">
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <Text style={styles.modalTitulo}>Motivo del rechazo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Comprobante ilegible"
              value={motivo}
              onChangeText={setMotivo}
              multiline
            />
            <View style={styles.filaBotones}>
              <TouchableOpacity
                style={[styles.boton, styles.botonCancelarModal]}
                onPress={() => setPagoRechazando(null)}
              >
                <Text style={styles.botonTextoOscuro}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.boton, styles.botonRechazar]}
                onPress={confirmarRechazo}
              >
                <Text style={styles.botonTexto}>Rechazar pago</Text>
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
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  habitacion: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  cliente: { fontSize: 15, color: "#334155", marginTop: 2 },
  detalle: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  monto: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginTop: 6 },
  comprobante: {
    width: "100%",
    height: 220,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  avisoUrlInvalida: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#fef3c7",
    color: "#92400e",
    borderRadius: 8,
    fontSize: 12,
  },
  filaBotones: { flexDirection: "row", gap: 10, marginTop: 12 },
  boton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  botonAprobar: { backgroundColor: "#16a34a" },
  botonRechazar: { backgroundColor: "#dc2626" },
  botonCancelarModal: { backgroundColor: "#e2e8f0" },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { color: "#fff", fontWeight: "700" },
  botonTextoOscuro: { color: "#334155", fontWeight: "700" },
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
  modalCaja: { backgroundColor: "#fff", borderRadius: 12, padding: 18 },
  modalTitulo: { fontSize: 16, fontWeight: "700", marginBottom: 10, color: "#1e293b" },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    textAlignVertical: "top",
  },
});