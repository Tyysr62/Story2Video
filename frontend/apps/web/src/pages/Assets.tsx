import { useState } from "react";
import {
  Box,
  Heading,
  Input,
  InputField,
  InputSlot,
  InputIcon,
  SearchIcon,
  VStack,
  HStack,
  Text,
  Image,
  ScrollView,
} from "@story2video/ui";
import { useMediaQuery } from "../hooks/useMediaQuery";

// Mock data
const initialAssets = [
  { id: "1", title: "The Lost City", date: "2023-10-27", thumbnail: "https://placehold.co/300x200/png?text=Lost+City" },
  { id: "2", title: "Space Odyssey", date: "2023-10-26", thumbnail: "https://placehold.co/300x200/png?text=Space" },
  { id: "3", title: "Ocean Depths", date: "2023-10-25", thumbnail: "https://placehold.co/300x200/png?text=Ocean" },
  { id: "4", title: "Cyberpunk City", date: "2023-10-24", thumbnail: "https://placehold.co/300x200/png?text=Cyberpunk" },
  { id: "5", title: "Medieval Kingdom", date: "2023-10-23", thumbnail: "https://placehold.co/300x200/png?text=Medieval" },
];

const Assets = () => {
  const [search, setSearch] = useState("");
  const [assets] = useState(initialAssets);
  const isMobile = useMediaQuery("(max-width: 767px)");

  const filteredAssets = assets.filter((asset) =>
    asset.title.toLowerCase().includes(search.toLowerCase())
  );

  // Mobile layout: Full width cards in a scrollable list
  if (isMobile) {
    return (
      <Box flex={1} bg="$backgroundLight0" p="$4">
        <VStack space="md" flex={1}>
          <VStack space="xs">
            <Heading size="lg">Assets Library</Heading>
            <Text size="sm" color="$textLight500">Manage your generated stories.</Text>
          </VStack>

          {/* Search Bar */}
          <Input size="lg">
            <InputSlot pl="$3">
              <InputIcon as={SearchIcon} />
            </InputSlot>
            <InputField
              placeholder="Search stories..."
              value={search}
              onChangeText={setSearch}
            />
          </Input>

          {/* List of Assets */}
          <ScrollView flex={1} showsVerticalScrollIndicator={false}>
            <VStack space="md" pb="$4">
              {filteredAssets.map((asset) => (
                <Box
                  key={asset.id}
                  bg="$white"
                  borderRadius="$lg"
                  borderWidth={1}
                  borderColor="$borderLight200"
                  overflow="hidden"
                  shadowColor="$black"
                  shadowOffset={{ width: 0, height: 2 }}
                  shadowOpacity={0.1}
                  shadowRadius={4}
                  elevation={2}
                >
                  <Image
                    source={{ uri: asset.thumbnail }}
                    alt={asset.title}
                    h={150}
                    w="100%"
                    resizeMode="cover"
                  />
                  <VStack p="$3" space="xs">
                    <Heading size="sm" isTruncated>{asset.title}</Heading>
                    <Text size="xs" color="$textLight400">Created: {asset.date}</Text>
                  </VStack>
                </Box>
              ))}
            </VStack>
          </ScrollView>

          {filteredAssets.length === 0 && (
            <Box flex={1} justifyContent="center" alignItems="center" py="$10">
              <Text color="$textLight400">No assets found.</Text>
            </Box>
          )}
        </VStack>
      </Box>
    );
  }

  // Desktop layout: Grid of cards
  return (
    <Box flex={1} bg="$backgroundLight0" p="$8">
      <VStack space="xl">
        <VStack space="sm">
          <Heading size="2xl">Assets Library</Heading>
          <Text color="$textLight500">Manage your generated stories and videos.</Text>
        </VStack>

        {/* Search Bar */}
        <Box maxWidth={500}>
          <Input size="xl">
            <InputSlot pl="$3">
              <InputIcon as={SearchIcon} />
            </InputSlot>
            <InputField
              placeholder="Search by story name..."
              value={search}
              onChangeText={setSearch}
            />
          </Input>
        </Box>

        {/* Grid of Assets */}
        <HStack space="md" flexWrap="wrap">
          {filteredAssets.map((asset) => (
            <Box
              key={asset.id}
              width={300}
              bg="$white"
              borderRadius="$lg"
              borderWidth={1}
              borderColor="$borderLight200"
              overflow="hidden"
              mb="$4"
              shadowColor="$black"
              shadowOffset={{ width: 0, height: 2 }}
              shadowOpacity={0.1}
              shadowRadius={4}
              elevation={2}
            >
              <Image
                source={{ uri: asset.thumbnail }}
                alt={asset.title}
                h={160}
                w="100%"
                resizeMode="cover"
              />
              <VStack p="$4" space="xs">
                <Heading size="sm" isTruncated>{asset.title}</Heading>
                <Text size="xs" color="$textLight400">Created: {asset.date}</Text>
              </VStack>
            </Box>
          ))}
        </HStack>

        {filteredAssets.length === 0 && (
          <Box flex={1} justifyContent="center" alignItems="center" py="$10">
            <Text color="$textLight400">No assets found.</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default Assets;
