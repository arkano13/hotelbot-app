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

// Pantalla genérica: carga una lista con `obtenerLista`, muestra cada item
// con `renderInfo`, y ejecuta `alConfirmar` cuando el usuario presiona el
// botón de acción, pidiendo confirmación primero.
export default function ListaAccion({
  obtenerLista,
  renderInfo,
  obtenerIdAccion,
  alConfirmar,
  textoBoton,
  colorBoton = "#2563eb",
  textoVacio = "No hay nada pendiente aquí.",
  tituloConfirmacion = "¿Confirmar?",
}) {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(
    async (mostrarSpinner = true) => {
      if (mostrarSpinner) setCargando(true);
      setError(null);
      try {
        const datos = await obtenerLista();
        setItems(datos);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
        setRefrescando(false);
      }
    },
    [obtenerLista]
  );

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  function confirmar(item) {
    const id = obtenerIdAccion(item);
    Alert.alert(tituloConfirmacion, "Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, confirmar",
        style: "destructive",
        onPress: async () => {
          setProcesandoId(id);
          try {
            await alConfirmar(item);
            await cargar(false);
          } catch (err) {
            Alert.alert("No se pudo completar", err.message);
          } finally {
            setProcesandoId(null);
          }
        },
      },
    ]);
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
        data={items}
        keyExtractor={(item) => obtenerIdAccion(item)}
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
          <Text style={styles.vacio}>{textoVacio}</Text>
        }
        renderItem={({ item }) => {
          const id = obtenerIdAccion(item);
          const procesando = procesandoId === id;

          return (
            <View style={styles.tarjeta}>
              {renderInfo(item)}
              <TouchableOpacity
                style={[
                  styles.boton,
                  { backgroundColor: colorBoton },
                  procesando && styles.botonDeshabilitado,
                ]}
                disabled={procesando}
                onPress={() => confirmar(item)}
              >
                {procesando ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.botonTexto}>{textoBoton}</Text>
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
  boton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
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
});