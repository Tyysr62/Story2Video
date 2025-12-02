import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import { GluestackUIProvider } from "@story2video/ui";
import Layout from "./components/Layout";
import Create from "./pages/Create";
import Storyboard from "./pages/Storyboard";
import ShotDetail from "./pages/ShotDetail";
import Assets from "./pages/Assets";
import Preview from "./pages/Preview";
import Operations from "./pages/Operations";
import "@story2video/ui/global.css";

function App() {
  const [mode] = useState<"light" | "dark">("light");

  return (
    <GluestackUIProvider mode={mode}>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Create />} />
            <Route path="/storyboard" element={<Storyboard />} />
            <Route path="/shot/:id" element={<ShotDetail />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/preview" element={<Preview />} />
            <Route path="/operations" element={<Operations />} />
          </Route>
        </Routes>
      </Router>
    </GluestackUIProvider>
  );
}

export default App;
