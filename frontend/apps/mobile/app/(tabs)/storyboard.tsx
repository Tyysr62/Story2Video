import React, { useState } from "react";
import { ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Box,
  Heading,
  Button,
  ButtonText,
  VStack,
  HStack,
  Text,
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

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH * 0.8;

export default function StoryboardScreen() {
  const [shots] = useState(initialShots);
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  const handleDetailClick = (id: string) => {
    router.push(`/shot/${id}`);
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

      router.push("/preview");
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
    <Box flex={1} bg="$backgroundLight0">
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <VStack flex={1} space="md" p="$4">
          <Box>
            <Heading size="2xl">Storyboard</Heading>
            <Text color="$textLight500" size="sm">
              Swipe to review shots.
            </Text>
          </Box>

          <Box flex={1} justifyContent="center">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 0,
                alignItems: "center",
              }}
              decelerationRate="fast"
              snapToInterval={CARD_WIDTH + 20} // Width + margin
              snapToAlignment="center"
            >
              {shots.map((shot, index) => (
                <Box
                  key={shot.id}
                  width={CARD_WIDTH}
                  mr={index === shots.length - 1 ? 0 : "$5"}
                  bg="$white"
                  borderRadius="$xl"
                  borderColor="$borderLight200"
                  borderWidth={1}
                  overflow="hidden"
                >
                  <Image
                    source={{ uri: shot.thumbnail }}
                    alt={shot.title}
                    h={200}
                    w="100%"
                    resizeMode="cover"
                  />
                  <VStack space="sm" p="$4">
                    <VStack>
                      <Heading size="md" isTruncated>
                        {shot.title}
                      </Heading>
                      <HStack mt="$1">
                        <Badge
                          size="md"
                          variant="solid"
                          borderRadius="$sm"
                          action={getBadgeAction(shot.status)}
                        >
                          <BadgeText>{shot.status}</BadgeText>
                        </Badge>
                      </HStack>
                    </VStack>

                    <Button
                      size="md"
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
            </ScrollView>
          </Box>

          <Box py="$2">
            <Button
              size="xl"
              action="primary"
              onPress={handleGenerateVideo}
              isDisabled={generating}
            >
              {generating && <Spinner mr="$2" color="$white" />}
              <ButtonText>
                {generating ? "Synthesizing..." : "Generate Video"}
              </ButtonText>
            </Button>
          </Box>
        </VStack>
      </SafeAreaView>
    </Box>
  );
}
