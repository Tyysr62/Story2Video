import { Link, useLocation, Outlet } from "react-router-dom";
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Heading,
} from "@story2video/ui";
import { Home, Library, ListTodo } from "lucide-react";
import { useMediaQuery } from "../hooks/useMediaQuery";

interface NavItemProps {
  to: string;
  icon: React.ComponentType;
  label: string;
  isActive: boolean;
  isMobile?: boolean;
}

const NavItem = ({ to, icon: IconComp, label, isActive, isMobile }: NavItemProps) => {
  if (isMobile) {
    return (
      <Link to={to} style={{ textDecoration: "none", flex: 1 }}>
        <VStack alignItems="center" py="$2">
          <Icon
            as={IconComp}
            size="md"
            color={isActive ? "$primary500" : "$textLight500"}
          />
          <Text
            size="xs"
            mt="$1"
            fontWeight={isActive ? "$bold" : "$normal"}
            color={isActive ? "$primary500" : "$textLight500"}
          >
            {label}
          </Text>
        </VStack>
      </Link>
    );
  }

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
        >
          {label}
        </Text>
      </HStack>
    </Link>
  );
};

// Desktop sidebar component
const Sidebar = () => {
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 767px)");

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  if (isMobile) return null;

  return (
    <Box
      w={250}
      bg="$backgroundLight50"
      borderRightWidth={1}
      borderColor="$borderLight200"
      p="$4"
    >
      <VStack space="lg">
        <HStack alignItems="center" space="sm" px="$2" mb="$4">
          <Box
            w="$8"
            h="$8"
            bg="$primary500"
            borderRadius="$md"
            alignItems="center"
            justifyContent="center"
          >
            <Text color="white" fontWeight="bold">
              S2V
            </Text>
          </Box>
          <Heading size="md">Story2Video</Heading>
        </HStack>

        <VStack>
          <Text
            size="xs"
            fontWeight="$bold"
            color="$textLight400"
            mb="$2"
            px="$2"
          >
            菜单
          </Text>
          <NavItem to="/" icon={Home} label="创建故事" isActive={isActive("/")} />
          <NavItem to="/operations" icon={ListTodo} label="任务列表" isActive={isActive("/operations") || isActive("/storyboard") || isActive("/shot") || isActive("/preview")} />
          <NavItem to="/assets" icon={Library} label="素材库" isActive={isActive("/assets")} />
        </VStack>
      </VStack>
    </Box>
  );
};

// Mobile bottom tabs component
const BottomTabs = () => {
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 767px)");

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  if (!isMobile) return null;

  return (
    <Box
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      bg="$white"
      borderTopWidth={1}
      borderColor="$borderLight200"
      sx={{
        _web: {
          position: "fixed",
        },
      }}
    >
      <HStack justifyContent="space-around" alignItems="center" py="$1">
        <NavItem to="/" icon={Home} label="创作" isActive={isActive("/")} isMobile />
        <NavItem to="/operations" icon={ListTodo} label="任务" isActive={isActive("/operations") || isActive("/storyboard") || isActive("/shot") || isActive("/preview")} isMobile />
        <NavItem to="/assets" icon={Library} label="素材" isActive={isActive("/assets")} isMobile />
      </HStack>
    </Box>
  );
};

const Layout = () => {
  const isMobile = useMediaQuery("(max-width: 767px)");

  return (
    <HStack flex={1} h="$full" overflow="hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <Box
        flex={1}
        bg="$backgroundLight0"
        pb={isMobile ? "$16" : "$0"}
        overflow="scroll"
      >
        <Outlet />
      </Box>

      {/* Mobile Bottom Tabs */}
      <BottomTabs />
    </HStack>
  );
};

export default Layout;
