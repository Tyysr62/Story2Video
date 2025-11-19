import React, { useState } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Box,
  Heading,
  Textarea,
  TextareaInput,
  Button,
  ButtonText,
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicatorWrapper,
  SelectDragIndicator,
  SelectItem,
  VStack,
  Text,
  Spinner,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
  Icon,
  ChevronDownIcon,
} from "@story2video/ui";

export default function CreateScreen() {
  const [storyText, setStoryText] = useState("");
  const [style, setStyle] = useState("movie");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleGenerate = async () => {
    if (!storyText.trim()) {
      toast.show({
        placement: "top",
        render: ({ id }) => {
          return (
            <Toast action="error" variant="accent" nativeID={id}>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Please enter story text.</ToastDescription>
            </Toast>
          );
        },
      });
      return;
    }
    setLoading(true);
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Success
      router.push("/storyboard");
    } catch (error) {
      toast.show({
        placement: "top",
        render: ({ id }) => {
          return (
            <Toast action="error" variant="accent" nativeID={id}>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>
                Generation failed. Please try again.
              </ToastDescription>
            </Toast>
          );
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box flex={1} bg="$backgroundLight0">
      <SafeAreaView style={{ flex: 1 }}>
        <Box flex={1} p="$4">
          <VStack space="xl">
            <VStack space="xs">
              <Heading size="2xl">Create New Story</Heading>
              <Text size="sm" color="$textLight500">
                Enter your story details below to generate a video storyboard.
              </Text>
            </VStack>

            <VStack space="md">
              <Text fontWeight="$bold">Story Text</Text>
              <Textarea size="xl" h={150}>
                <TextareaInput
                  placeholder="Once upon a time..."
                  value={storyText}
                  onChangeText={setStoryText}
                />
              </Textarea>
            </VStack>

            <VStack space="md">
              <Text fontWeight="$bold">Style</Text>
              <Select selectedValue={style} onValueChange={setStyle}>
                <SelectTrigger variant="outline" size="md">
                  <SelectInput placeholder="Select option" />
                  <SelectIcon mr="$3">
                    <Icon as={ChevronDownIcon} />
                  </SelectIcon>
                </SelectTrigger>
                <SelectPortal>
                  <SelectBackdrop />
                  <SelectContent>
                    <SelectDragIndicatorWrapper>
                      <SelectDragIndicator />
                    </SelectDragIndicatorWrapper>
                    <SelectItem label="Movie" value="movie" />
                    <SelectItem label="Animation" value="animation" />
                    <SelectItem label="Realistic" value="realistic" />
                  </SelectContent>
                </SelectPortal>
              </Select>
            </VStack>

            <Button
              size="xl"
              variant="solid"
              action="primary"
              isDisabled={loading}
              onPress={handleGenerate}
              mt="$4"
            >
              {loading && <Spinner color="$white" mr="$2" />}
              <ButtonText>
                {loading ? "Generating..." : "Generate Story"}
              </ButtonText>
            </Button>
          </VStack>
        </Box>
      </SafeAreaView>
    </Box>
  );
}
