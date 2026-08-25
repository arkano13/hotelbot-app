import { useCallback, useState } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";

function formatearHace(fechaISO) {
  if (!fechaISO) return "";
  const minutos = Math.floor((Date.now() - new Date(fechaISO).getTime()) / 60000);
  if (minutos < 1) return "justo ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `hace ${horas} h`;
}

export default function EscalacionesScreen() {
  const [pendientes, setPendientes] = useState([]);
  const [enHumano, setEnHumano] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async (mostrarSpinner = true) => {
    if (mostrarSpinner) setCargando(true);
    setError(null);
    try {
      const [datosPendientes, datosHumano] = await Promise.all([
        api.obtenerEscalaciones(),
        api.obtenerConversacionesEnModoHumano(),
      ]);
      setPendientes(datosPendientes);
      setEnHumano(datosHumano);
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

  function confirmarAceptar(conversacion) {
    Alert.alert(
      "¿Tomar esta conversación?",
      `Cliente: ${conversacion.telefono}\n\nEl bot dejará de responderle — vas a tener que escribirle tú directo por WhatsApp.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, la tomo",
          onPress: async () => {
            setProcesandoId(conversacion.id);
            try {
              await api.aceptarEscalacion(conversacion.id);
              await cargar(false);
            } catch (err) {
              Alert.alert("No se pudo aceptar", err.message);
            } finally {
              setProcesandoId(null);
            }
          },
        },
      ]
    );
  }

  function confirmarRechazar(conversacion) {
    Alert.alert(
      "¿Rechazar esta solicitud?",
      "El bot va a seguir atendiendo esta conversación normalmente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, rechazar",
          style: "destructive",
          onPress: async () => {
            setProcesandoId(conversacion.id);
            try {
              await api.rechazarEscalacion(conversacion.id);
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

  function confirmarDevolverABot(conversacion) {
    Alert.alert(
      "¿Devolver esta conversación al bot?",
      `${conversacion.telefono}\n\nEl bot va a volver a responderle automáticamente a este cliente.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, devolver",
          onPress: async () => {
            setProcesandoId(conversacion.id);
            try {
              await api.devolverABot(conversacion.id);
              await cargar(false);
            } catch (err) {
              Alert.alert("No se pudo devolver", err.message);
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

  const secciones = [
    {
      title: "Esperando que alguien acepte",
      data: pendientes,
      tipo: "pendiente",
    },
    {
      title: "En atención humana ahorita",
      data: enHumano,
      tipo: "humano",
    },
  ];

  return (
    <View style={styles.contenedor}>
      {error && (
        <TouchableOpacity style={styles.errorBox} onPress={() => cargar()}>
          <Text style={styles.errorTexto}>{error} — toca para reintentar</Text>
        </TouchableOpacity>
      )}

      <SectionList
        sections={secciones}
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
        renderSectionHeader={({ section }) =>
          section.data.length > 0 ? (
            <Text style={styles.encabezadoSeccion}>{section.title}</Text>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.vacio}>
            No hay nada pendiente ni en atención humana ahorita.
          </Text>
        }
        renderItem={({ item, section }) => {
          const procesando = procesandoId === item.id;

          if (section.tipo === "pendiente") {
            return (
              <View style={styles.tarjeta}>
                <View style={styles.filaTitulo}>
                  <Text style={styles.codigo}>{item.codigo}</Text>
                  <Text style={styles.hace}>{formatearHace(item.escaladaEn)}</Text>
                </View>
                <Text style={styles.telefono}>{item.telefono}</Text>
                {item.nombreCliente && (
                  <Text style={styles.nombre}>{item.nombreCliente}</Text>
                )}
                <Text style={styles.motivo}>{item.motivoEscalar}</Text>

                <View style={styles.filaBotones}>
                  <TouchableOpacity
                    style={[styles.boton, styles.botonAceptar, procesando && styles.botonDeshabilitado]}
                    disabled={procesando}
                    onPress={() => confirmarAceptar(item)}
                  >
                    {procesando ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.botonTexto}>Tomar conversación</Text>
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
          }

          return (
            <View style={[styles.tarjeta, styles.tarjetaHumano]}>
              <Text style={styles.codigo}>{item.codigo}</Text>
              <Text style={styles.telefono}>{item.telefono}</Text>
              {item.nombreCliente && (
                <Text style={styles.nombre}>{item.nombreCliente}</Text>
              )}

              <TouchableOpacity
                style={[styles.boton, styles.botonDevolver, procesando && styles.botonDeshabilitado]}
                disabled={procesando}
                onPress={() => confirmarDevolverABot(item)}
              >
                {procesando ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.botonTexto}>Devolver al bot</Text>
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
  vacio: { textAlign: "center", color: "#94a3b8", marginTop: 40, fontSize: 15 },
  encabezadoSeccion: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 14,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  tarjeta: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: "#f59e0b",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tarjetaHumano: { borderLeftColor: "#2563eb" },
  filaTitulo: { flexDirection: "row", justifyContent: "space-between" },
  codigo: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  hace: { fontSize: 12, color: "#94a3b8" },
  telefono: { fontSize: 17, fontWeight: "700", color: "#1e293b", marginTop: 4 },
  nombre: { fontSize: 14, color: "#334155", marginTop: 2 },
  motivo: { fontSize: 14, color: "#475569", marginTop: 8, fontStyle: "italic" },
  filaBotones: { flexDirection: "row", gap: 10, marginTop: 14 },
  boton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  botonAceptar: { backgroundColor: "#16a34a", marginTop: 0 },
  botonRechazar: { backgroundColor: "#dc2626", marginTop: 0 },
  botonDevolver: { backgroundColor: "#2563eb" },
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