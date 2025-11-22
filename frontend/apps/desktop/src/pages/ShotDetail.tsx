import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  HStack,
  Text,
  Spinner,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
  Icon,
  ArrowLeftIcon,
  Image,
  Badge,
  BadgeText,
  ChevronDownIcon,
} from "@story2video/ui";

const ShotDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // State for form fields
  const [prompt, setPrompt] = useState(
    "A cinematic shot of a hero standing on a cliff...",
  );
  const [narration, setNarration] = useState(
    "The journey was long and treacherous.",
  );
  const [transition, setTransition] = useState("ken_burns");
  const [status, setStatus] = useState<
    "Not Started" | "Generating" | "Generated"
  >("Generated");
  const [imageUrl, setImageUrl] = useState(
    `https://placehold.co/800x450/png?text=Shot+${id || "1"}`,
  );

  const handleGenerateImage = async () => {
    setStatus("Generating");
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update image to show change (adding timestamp to bypass cache if it were real, here just mock)
      setImageUrl(
        `https://placehold.co/800x450/png?text=New+Shot+${id}+${Date.now()}`,
      );
      setStatus("Generated");

      toast.show({
        placement: "top",
        render: ({ id }) => {
          return (
            <Toast action="success" variant="accent" nativeID={id}>
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>
                Image regenerated successfully.
              </ToastDescription>
            </Toast>
          );
        },
      });
    } catch (error) {
      setStatus("Generated"); // Revert on error or set to Error state
      toast.show({
        placement: "top",
        render: ({ id }) => {
          return (
            <Toast action="error" variant="accent" nativeID={id}>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to generate image.</ToastDescription>
            </Toast>
          );
        },
      });
    }
  };

  return (
    <Box flex={1} bg="$backgroundLight0" p="$4">
      {/* Header */}
      <HStack
        justifyContent="space-between"
        alignItems="center"
        pb="$4"
        borderBottomWidth={1}
        borderColor="$borderLight200"
        mb="$4"
      >
        <Button variant="link" onPress={() => navigate("/storyboard")} p="$0">
          <Icon as={ArrowLeftIcon} mr="$2" />
          <ButtonText color="$textLight800">Back to Storyboard</ButtonText>
        </Button>

        <HStack space="md" alignItems="center">
          <Heading size="md">Shot {id || "1"}</Heading>
          <Badge
            size="md"
            variant="solid"
            borderRadius="$sm"
            action={status === "Generating" ? "info" : "success"}
          >
            <BadgeText>{status}</BadgeText>
          </Badge>
        </HStack>

        {/* Spacer to balance header if needed, or could be actions */}
        <Box w={100} />
      </HStack>

      <HStack flex={1} space="xl" flexDirection={{ base: "column", md: "row" }}>
        {/* Left Column: Image Preview */}
        <VStack flex={1} space="md">
          <Box
            flex={1}
            bg="$backgroundLight100"
            borderRadius="$lg"
            overflow="hidden"
            justifyContent="center"
            alignItems="center"
            borderWidth={1}
            borderColor="$borderLight200"
            maxHeight={400}
          >
            <Image
              source={{ uri: imageUrl }}
              alt="Shot Preview"
              w="100%"
              h="100%"
              resizeMode="contain"
            />
            {status === "Generating" && (
              <Box
                position="absolute"
                bg="rgba(0,0,0,0.5)"
                w="100%"
                h="100%"
                justifyContent="center"
                alignItems="center"
              >
                <Spinner size="large" color="$white" />
                <Text color="$white" mt="$2">
                  Generating...
                </Text>
              </Box>
            )}
          </Box>
          <Button
            action="primary"
            size="lg"
            onPress={handleGenerateImage}
            isDisabled={status === "Generating"}
          >
            <ButtonText>
              {status === "Generating" ? "Processing..." : "Generate Image"}
            </ButtonText>
          </Button>
        </VStack>

        {/* Right Column: Controls */}
        <VStack
          flex={1}
          space="lg"
          bg="$white"
          p="$6"
          borderRadius="$lg"
          borderWidth={1}
          borderColor="$borderLight200"
        >
          <VStack space="sm">
            <Text fontWeight="$bold">Prompt</Text>
            <Textarea size="md" w="100%">
              <TextareaInput
                placeholder="Describe the scene..."
                value={prompt}
                onChangeText={setPrompt}
              />
            </Textarea>
            <Text size="xs" color="$textLight400">
              Modify the prompt to regenerate the image.
            </Text>
          </VStack>

          <VStack space="sm">
            <Text fontWeight="$bold">Transition Effect</Text>
            <Select selectedValue={transition} onValueChange={setTransition}>
              <SelectTrigger variant="outline" size="md">
                <SelectInput placeholder="Select effect" />
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
                  <SelectItem label="Ken Burns" value="ken_burns" />
                  <SelectItem label="Crossfade" value="crossfade" />
                  <SelectItem label="Volume Mix" value="volume_mix" />
                </SelectContent>
              </SelectPortal>
            </Select>
          </VStack>

          <VStack space="sm">
            <Text fontWeight="$bold">Narration</Text>
            <Textarea size="md" w="100%">
              <TextareaInput
                placeholder="Enter voiceover text..."
                value={narration}
                onChangeText={setNarration}
              />
            </Textarea>
          </VStack>
        </VStack>
      </HStack>
    </Box>
  );
};

export default ShotDetail;
