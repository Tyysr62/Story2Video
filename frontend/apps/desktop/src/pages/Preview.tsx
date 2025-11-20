import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Heading,
  Button,
  ButtonText,
  VStack,
  HStack,
  Text,
  Icon,
  ArrowLeftIcon,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
  Spinner,
} from "@story2video/ui";

// Mock video URL
const MOCK_VIDEO_URL = "https://www.w3schools.com/html/mov_bbb.mp4";

const Preview = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Mock export process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.show({
        placement: "top",
        render: ({ id }) => {
          return (
            <Toast action="success" variant="accent" nativeID={id}>
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>Video exported successfully!</ToastDescription>
            </Toast>
          );
        },
      });
    } catch (error) {
      toast.show({
        placement: "top",
        render: ({ id }) => {
          return (
            <Toast action="error" variant="accent" nativeID={id}>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to export video.</ToastDescription>
            </Toast>
          );
        },
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box flex={1} bg="$backgroundLight0" p="$4">
      {/* Header */}
      <HStack
        alignItems="center"
        pb="$4"
        borderBottomWidth={1}
        borderColor="$borderLight200"
        mb="$4"
        space="md"
      >
        <Button
          variant="link"
          onPress={() => navigate("/storyboard")}
          p="$0"
        >
          <Icon as={ArrowLeftIcon} size="xl" color="$textLight800" />
        </Button>
        <Heading size="xl">Preview Final Video</Heading>
      </HStack>

      {/* Main Content */}
      <VStack flex={1} space="lg" justifyContent="center" alignItems="center">
        <Box
          w="100%"
          maxWidth={1024}
          aspectRatio={16 / 9}
          bg="$black"
          borderRadius="$xl"
          overflow="hidden"
          shadowColor="$black"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.3}
          shadowRadius={8}
          elevation={5}
        >
          {/* Video Player */}
          {/* Using native video controls to satisfy: Play, Pause, Drag Timeline, Adjust Volume */}
          <video
            ref={videoRef}
            src={MOCK_VIDEO_URL}
            controls
            style={{ width: "100%", height: "100%", outline: "none" }}
            poster="https://placehold.co/1024x576/png?text=Video+Preview"
          >
            Your browser does not support the video tag.
          </video>
        </Box>

        {/* Controls / Actions Area */}
        <HStack
          w="100%"
          maxWidth={1024}
          justifyContent="space-between"
          alignItems="center"
          p="$4"
          bg="$white"
          borderRadius="$lg"
          borderWidth={1}
          borderColor="$borderLight200"
          shadowColor="$black"
          shadowOffset={{ width: 0, height: 1 }}
          shadowOpacity={0.05}
          shadowRadius={2}
          elevation={1}
        >
          <VStack>
            <Heading size="sm">My Story Video.mp4</Heading>
            <Text size="sm" color="$textLight500">Duration: 00:10 • 1080p</Text>
          </VStack>

          <Button
            size="lg"
            action="primary"
            onPress={handleExport}
            isDisabled={exporting}
          >
            {exporting && <Spinner color="$white" mr="$2" />}
            <ButtonText>{exporting ? "Exporting..." : "Export Video"}</ButtonText>
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default Preview;
