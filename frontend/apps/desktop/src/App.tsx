import React, { useState } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Outlet,
} from "react-router-dom";
import {
  GluestackUIProvider,
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Heading,
} from "@story2video/ui";
import { Home, Library, ListTodo } from "lucide-react";
import Create from "./pages/Create";
import Storyboard from "./pages/Storyboard";
import ShotDetail from "./pages/ShotDetail";
import Assets from "./pages/Assets";
import Preview from "./pages/Preview";
import Operations from "./pages/Operations";
import "@story2video/ui/global.css";

const SidebarItem = ({
  to,
  icon: IconComp,
  label,
}: {
  to: string;
  icon: any;
  label: string;
}) => {
  const location = useLocation();

  // Determine if the item is active.
  // Tasks should be active when viewing storyboard, shot details, or preview pages
  const isActive =
    location.pathname === to ||
    (to === "/operations" && (
      location.pathname.startsWith("/storyboard") ||
      location.pathname.startsWith("/shot") ||
      location.pathname.startsWith("/preview")
    ));

  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <HStack
        bg={isActive ? "$backgroundLight100" : "transparent"}
        p="$3"
        borderRadius="$md"
        mb="$2"
        alignItems="center"
      >
        <Icon
          as={IconComp}
          size="md"
          color={isActive ? "$primary500" : "$textLight500"}
        />
        <Text
          ml="$3"
          fontWeight={isActive ? "$bold" : "$normal"}
          color={isActive ? "$textLight900" : "$textLight700"}
        >{label}</Text>
      </HStack>
    </Link>
  );
};

const Layout = () => {
  return (
    <HStack flex={1} h="$full" overflow="hidden">
      {/* Sidebar */}
      <Box
        w={250}
        bg="$backgroundLight50"
        borderRightWidth={1}
        borderColor="$borderLight200"
        p="$4"
      >
        <VStack space="lg">
          <HStack alignItems="center" space="sm" px="$2" mb="$4">
            <img
              src="/logo.png"
              alt="Logo"
              style={{ width: 32, height: 32, borderRadius: 6 }}
            />
            <Heading size="md">Story2Video</Heading>
          </HStack>

          <VStack>
            <Text
              size="xs"
              fontWeight="$bold"
              color="$textLight400"
              mb="$2"
              px="$2"
            >菜单</Text>
            <SidebarItem to="/" icon={Home} label="创建故事" />
            <SidebarItem to="/operations" icon={ListTodo} label="任务列表" />
            <SidebarItem to="/assets" icon={Library} label="素材库" />
          </VStack>
        </VStack>
      </Box>

      {/* Main Content */}
      <Box flex={1} bg="$backgroundLight0" className="animate-fade-in">
        <Outlet />
      </Box>
    </HStack>
  );
};

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
