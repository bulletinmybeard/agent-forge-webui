import { Route, Routes, useLocation } from "react-router-dom";
import ChatLayout from "./components/ChatLayout";
import ChatPage from "./components/ChatPage";
import NotFound from "./components/NotFound";
import ServicesPage from "./services/components/ServicesPage";

const KeyedChatPage = () => {
  const location = useLocation();
  return <ChatPage key={location.key} />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatLayout />}>
        <Route index element={<KeyedChatPage />} />
        <Route path="chat/:sessionId" element={<KeyedChatPage />} />
      </Route>
      <Route path="/services" element={<ServicesPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
