import ChatBot from "@/components/ChatBot";
import { Card } from "@/components/ui/card";

export default function ChatPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Asistente Veterinario</h1>
        <p className="text-gray-600 mt-2">
          Haz preguntas sobre tus mascotas o sobre cuidado animal en general
        </p>
      </div>

      <Card className="p-0 h-[calc(100vh-300px)] min-h-96">
        <ChatBot />
      </Card>
    </div>
  );
}
