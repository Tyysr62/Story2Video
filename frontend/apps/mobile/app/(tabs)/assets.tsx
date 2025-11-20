import React, { useState } from "react";
import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Box,
  Heading,
  Input,
  InputField,
  InputSlot,
  InputIcon,
  SearchIcon,
  VStack,
  Text,
  Image,
} from "@story2video/ui";

// Mock data
const initialAssets = [
  {
    id: "1",
    title: "The Lost City",
    date: "2023-10-27",
    thumbnail: "https://placehold.co/600x400/png?text=Lost+City",
  },
  {
    id: "2",
    title: "Space Odyssey",
    date: "2023-10-26",
    thumbnail: "https://placehold.co/600x400/png?text=Space",
  },
  {
    id: "3",
    title: "Ocean Depths",
    date: "2023-10-25",
    thumbnail: "https://placehold.co/600x400/png?text=Ocean",
  },
  {
    id: "4",
    title: "Cyberpunk City",
    date: "2023-10-24",
    thumbnail: "https://placehold.co/600x400/png?text=Cyberpunk",
  },
  {
    id: "5",
    title: "Medieval Kingdom",
    date: "2023-10-23",
    thumbnail: "https://placehold.co/600x400/png?text=Medieval",
  },
];

export default function AssetsScreen() {
  const [search, setSearch] = useState("");
  const [assets] = useState(initialAssets);

  const filteredAssets = assets.filter((asset) =>
    asset.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: (typeof initialAssets)[0] }) => (
    <Box
      bg="$white"
      borderRadius="$lg"
      borderWidth={1}
      borderColor="$borderLight200"
      overflow="hidden"
      mb="$4"
    >
      <Image
        source={{ uri: item.thumbnail }}
        alt={item.title}
        h={180}
        w="100%"
        resizeMode="cover"
      />
      <VStack p="$4" space="xs">
        <Heading size="sm" isTruncated>
          {item.title}
        </Heading>
        <Text size="xs" color="$textLight400">
          Created: {item.date}
        </Text>
      </VStack>
    </Box>
  );

  return (
    <Box flex={1} bg="$backgroundLight0">
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <VStack flex={1} space="md" p="$4">
          <Heading size="2xl">Assets Library</Heading>

          <Box>
            <Input size="xl">
              <InputSlot pl="$3">
                <InputIcon as={SearchIcon} />
              </InputSlot>
              <InputField
                placeholder="Search assets..."
                value={search}
                onChangeText={setSearch}
              />
            </Input>
          </Box>

          {filteredAssets.length === 0 ? (
            <Box flex={1} justifyContent="center" alignItems="center">
              <Text color="$textLight400">No assets found.</Text>
            </Box>
          ) : (
            <FlatList
              data={filteredAssets}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </VStack>
      </SafeAreaView>
    </Box>
  );
}
