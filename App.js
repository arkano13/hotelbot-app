import { useEffect, useRef } from "react";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import * as Notifications from "expo-notifications";

import { useRegistrarNotificacionesPush } from "./src/api/notificacionesPush";
import ErrorBoundary from "./src/components/ErrorBoundary";

import DashboardScreen from "./src/screens/DashboardScreen";
import PagosScreen from "./src/screens/PagosScreen";
import MenuScreen from "./src/screens/MenuScreen";
import CheckInScreen from "./src/screens/CheckInScreen";
import CheckoutScreen from "./src/screens/CheckoutScreen";
import CancelarScreen from "./src/screens/CancelarScreen";
import MantenimientoScreen from "./src/screens/MantenimientoScreen";
import OcuparHabitacionScreen from "./src/screens/OcuparHabitacionScreen";
import ReservarScreen from "./src/screens/ReservarScreen";
import EditarReservasScreen from "./src/screens/EditarReservasScreen";
import TodasReservasScreen from "./src/screens/TodasReservasScreen";

const Tab = createBottomTabNavigator();
const StackInicio = createNativeStackNavigator();
const StackMas = createNativeStackNavigator();

function InicioStack() {
  return (
    <StackInicio.Navigator>
      <StackInicio.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Habitaciones" }}
      />
      <StackInicio.Screen
        name="EditarReservas"
        component={EditarReservasScreen}
        options={{ title: "Editar reserva" }}
      />
    </StackInicio.Navigator>
  );
}

function MasStack() {
  return (
    <StackMas.Navigator>
      <StackMas.Screen name="MenuPrincipal" component={MenuScreen} options={{ title: "Más acciones" }} />
      <StackMas.Screen name="CheckIn" component={CheckInScreen} options={{ title: "Entrada" }} />
      <StackMas.Screen name="Checkout" component={CheckoutScreen} options={{ title: "Salida" }} />
      <StackMas.Screen name="Cancelar" component={CancelarScreen} options={{ title: "Cancelar reserva" }} />
      <StackMas.Screen name="Mantenimiento" component={MantenimientoScreen} options={{ title: "Mantenimiento" }} />
      <StackMas.Screen name="OcuparHabitacion" component={OcuparHabitacionScreen} options={{ title: "Ocupar habitación" }} />
      <StackMas.Screen name="Reservar" component={ReservarScreen} options={{ title: "Reservar" }} />
      <StackMas.Screen name="TodasReservas" component={TodasReservasScreen} options={{ title: "Todas las reservaciones" }} />
    </StackMas.Navigator>
  );
}

function Icono({ emoji }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function App() {
  const navegacionRef = useNavigationContainerRef();
  const suscripcionRespuesta = useRef(null);

  useRegistrarNotificacionesPush();

  useEffect(() => {
    // Cuando el usuario toca la notificación, lo llevamos directo a la
    // pantalla que corresponde según el tipo de aviso.
    suscripcionRespuesta.current =
      Notifications.addNotificationResponseReceivedListener((respuesta) => {
        const tipo = respuesta.notification.request.content.data?.tipo;

        if (!navegacionRef.isReady()) return;

        if (tipo === "pago_pendiente") {
          navegacionRef.navigate("Pagos");
        }
      });

    return () => {
      suscripcionRespuesta.current?.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <NavigationContainer ref={navegacionRef}>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#2563eb",
          }}
        >
          <Tab.Screen
            name="Inicio"
            component={InicioStack}
            options={{ title: "Habitaciones", tabBarIcon: () => <Icono emoji="🏨" /> }}
          />
          <Tab.Screen
            name="Pagos"
            component={PagosScreen}
            options={{ headerShown: true, title: "Pagos pendientes", tabBarIcon: () => <Icono emoji="💳" /> }}
          />
          <Tab.Screen
            name="Más"
            component={MasStack}
            options={{ tabBarIcon: () => <Icono emoji="⚙️" /> }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}
