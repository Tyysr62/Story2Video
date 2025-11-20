import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Heading,
  Button,
  ButtonText,
  VStack,
  HStack,
  Text,
  ScrollView,
  Image,
  Badge,
  BadgeText,
  Spinner,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from "@story2video/ui";

// Mock data for storyboard shots
const initialShots = [
  {
    id: "1",
    title: "Shot 1: The Beginning",
    status: "Ready",
    thumbnail: "https://placehold.co/600x400/png?text=Shot+1",
  },
  {
    id: "2",
    title: "Shot 2: The Journey",
    status: "Generating",
    thumbnail: "https://placehold.co/600x400/png?text=Shot+2",
  },
  {
    id: "3",
    title: "Shot 3: The Climax",
    status: "Draft",
    thumbnail: "https://placehold.co/600x400/png?text=Shot+3",
  },
  {
    id: "4",
    title: "Shot 4: The End",
    status: "Draft",
    thumbnail: "https://placehold.co/600x400/png?text=Shot+4",
  },
];

const Storyboard = () => {
  const navigate = useNavigate();
  const [shots] = useState(initialShots);
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  const handleDetailClick = (id: string) => {
    navigate(`/shot/${id}`);
  };

  const handleGenerateVideo = async () => {
    setGenerating(true);
    try {
      // Mock video synthesis process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      toast.show({
        placement: "top",
        render: ({ id }) => {
          return (
            <Toast action="success" variant="accent" nativeID={id}>
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>Video synthesis complete!</ToastDescription>
            </Toast>
          );
        },
      });

      navigate("/preview");
    } catch (error) {
      console.error(error);
      toast.show({
        placement: "top",
        render: ({ id }) => {
          return (
            <Toast action="error" variant="accent" nativeID={id}>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Video generation failed.</ToastDescription>
            </Toast>
          );
        },
      });
    } finally {
      setGenerating(false);
    }
  };

  const getBadgeAction = (status: string) => {
    switch (status) {
      case "Ready":
        return "success";
      case "Generating":
        return "info";
      case "Draft":
        return "muted";
      default:
        return "info";
    }
  };

  return (
    <Box flex={1} bg="$backgroundLight0" p="$4">
      <VStack space="md" flex={1}>
        <Box>
          <Heading size="xl">Storyboard</Heading>
          <Text color="$textLight500">
            Review and edit your shots before generating the video.
          </Text>
        </Box>

        <Box flex={1} justifyContent="center">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={{ paddingHorizontal: 16, alignItems: "center" }}
          >
            <HStack space="lg">
              {shots.map((shot) => (
                <Box
                  key={shot.id}
                  width={300}
                  bg="$white"
                  borderRadius="$lg"
                  borderColor="$borderLight200"
                  borderWidth={1}
                  overflow="hidden"
                  shadowColor="$black"
                  shadowOffset={{ width: 0, height: 2 }}
                  shadowOpacity={0.1}
                  shadowRadius={4}
                  elevation={2}
                >
                  <Image
                    source={{ uri: shot.thumbnail }}
                    alt={shot.title}
                    h={180}
                    w="100%"
                    resizeMode="cover"
                  />
                  <VStack space="sm" p="$4">
                    <VStack>
                      <Heading size="sm" isTruncated>
                        {shot.title}
                      </Heading>
                      <HStack mt="$1">
                        <Badge
                          size="sm"
                          variant="solid"
                          borderRadius="$sm"
                          action={getBadgeAction(shot.status)}
                        >
                          <BadgeText>{shot.status}</BadgeText>
                        </Badge>
                      </HStack>
                    </VStack>

                    <Button
                      size="sm"
                      variant="outline"
                      action="secondary"
                      onPress={() => handleDetailClick(shot.id)}
                      mt="$2"
                    >
                      <ButtonText>Details</ButtonText>
                    </Button>
                  </VStack>
                </Box>
              ))}
            </HStack>
          </ScrollView>
        </Box>

        <Box py="$4" borderTopWidth={1} borderColor="$borderLight200" alignItems="center">
          <Button
            size="xl"
            action="primary"
            onPress={handleGenerateVideo}
            isDisabled={generating}
            width="100%"
            maxWidth={400}
          >
            {generating && <Spinner mr="$2" color="$white" />}
            <ButtonText>
              {generating ? "Synthesizing Video..." : "Generate Video"}
            </ButtonText>
          </Button>
        </Box>
      </VStack>
    </Box>
  );
};

export default Storyboard;
