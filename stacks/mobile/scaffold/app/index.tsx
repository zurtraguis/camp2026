import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { create } from "zustand";

type CounterState = { count: number; inc: () => void };
const useCounter = create<CounterState>((set) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
}));

export default function Home() {
  const { count, inc } = useCounter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Harness Mobile</Text>
      <Text style={styles.body}>Scaffold mínimo (Expo + expo-router + Zustand).</Text>
      <Pressable onPress={inc} style={styles.button}>
        <Text style={styles.buttonText}>Tap count: {count}</Text>
      </Pressable>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: "#fff", fontSize: 28, fontWeight: "700", marginBottom: 8 },
  body: { color: "#aaa", fontSize: 14, textAlign: "center", marginBottom: 24 },
  button: { backgroundColor: "#3b82f6", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
