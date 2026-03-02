import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./app/page";
import InterviewPage from "./app/interview/page";
import HistoryPage from "./app/history/page";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/interview" element={<InterviewPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </BrowserRouter>
  );
}