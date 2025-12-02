import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatList } from "react-native";
import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Badge,
  BadgeText,
  Spinner,
  Pressable,
} from "@story2video/ui";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { mockOperations, OperationStatus } from "@story2video/core";
import type { Operation, OperationType } from "@story2video/core";

export default function OperationsScreen() {
  const [operations] = useState<Operation[]>(mockOperations);
  const [filter, setFilter] = useState<OperationStatus | "all">("all");

  const filteredOperations = filter === "all" 
    ? operations 
    : operations.filter(op => op.status === filter);

  const getStatusBadge = (status: OperationStatus) => {
    switch (status) {
      case "succeeded":
        return { action: "success" as const, icon: "check-circle" as const, label: "成功" };
      case "failed":
        return { action: "error" as const, icon: "times-circle" as const, label: "失败" };
      case "running":
        return { action: "info" as const, icon: "spinner" as const, label: "运行中" };
      case "queued":
        return { action: "muted" as const, icon: "clock-o" as const, label: "排队中" };
      default:
        return { action: "muted" as const, icon: "clock-o" as const, label: status };
    }
  };

  const getTypeIcon = (type: OperationType): "film" | "image" | "video-camera" => {
    switch (type) {
      case "story_create":
        return "film";
      case "shot_regen":
        return "image";
      case "video_render":
        return "video-camera";
      default:
        return "film";
    }
  };

  const getTypeLabel = (type: OperationType) => {
    switch (type) {
      case "story_create":
        return "创建故事";
      case "shot_regen":
        return "重新生成分镜";
      case "video_render":
        return "渲染视频";
      default:
        return type;
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "-";
    const date = new Date(timeStr);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const FilterButton = ({ 
    value, 
    label, 
    action 
  }: { 
    value: OperationStatus | "all"; 
    label: string; 
    action?: "info" | "positive" | "negative" | "secondary";
  }) => (
    <Pressable onPress={() => setFilter(value)}>
      <Box
        bg={filter === value ? "$primary500" : "$backgroundLight100"}
        px="$3"
        py="$2"
        borderRadius="$full"
      >
        <Text
          size="sm"
          color={filter === value ? "$white" : "$textLight700"}
          fontWeight={filter === value ? "$bold" : "$normal"}
        >
          {label}
        </Text>
      </Box>
    </Pressable>
  );

  return (
    <Box flex={1} bg="$backgroundLight0">
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <VStack space="md" flex={1} p="$4">
          <VStack space="xs">
            <Heading size="xl">任务列表</Heading>
            <Text size="sm" color="$textLight500">
              查看所有任务的执行状态
            </Text>
          </VStack>

          {/* Filter Buttons */}
          <HStack space="sm" flexWrap="wrap" mb="$2">
            <FilterButton value="all" label="全部" />
            <FilterButton value={OperationStatus.RUNNING} label="运行中" action="info" />
            <FilterButton value={OperationStatus.QUEUED} label="排队中" />
            <FilterButton value={OperationStatus.SUCCEEDED} label="已完成" action="positive" />
            <FilterButton value={OperationStatus.FAILED} label="失败" action="negative" />
          </HStack>

          {/* Operations List */}
          <FlatList
            data={filteredOperations}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16, gap: 12 }}
            ListEmptyComponent={
              <Box p="$8" alignItems="center">
                <Text color="$textLight400">暂无任务</Text>
              </Box>
            }
            renderItem={({ item: op }) => {
              const statusInfo = getStatusBadge(op.status);
              const typeIcon = getTypeIcon(op.type);

              return (
                <Box
                  bg="$white"
                  borderRadius="$lg"
                  borderColor="$borderLight200"
                  borderWidth={1}
                  p="$3"
                  shadowColor="$black"
                  shadowOffset={{ width: 0, height: 1 }}
                  shadowOpacity={0.05}
                  shadowRadius={2}
                  elevation={1}
                >
                  <VStack space="sm">
                    {/* Header Row */}
                    <HStack justifyContent="space-between" alignItems="center">
                      <HStack space="sm" alignItems="center" flex={1}>
                        <Box
                          w="$8"
                          h="$8"
                          bg="$backgroundLight100"
                          borderRadius="$md"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <FontAwesome name={typeIcon} size={16} color="#666" />
                        </Box>
                        <VStack flex={1}>
                          <Text fontWeight="$bold" size="sm" numberOfLines={1}>
                            {getTypeLabel(op.type)}
                          </Text>
                          <Text size="xs" color="$textLight400">
                            {op.id.slice(0, 8)}...
                          </Text>
                        </VStack>
                      </HStack>
                      <Badge
                        size="sm"
                        variant="solid"
                        borderRadius="$full"
                        action={statusInfo.action}
                      >
                        <HStack space="xs" alignItems="center" px="$1">
                          {op.status === "running" ? (
                            <Spinner size="small" color="$white" />
                          ) : (
                            <FontAwesome name={statusInfo.icon} size={10} color="white" />
                          )}
                          <BadgeText>{statusInfo.label}</BadgeText>
                        </HStack>
                      </Badge>
                    </HStack>

                    {/* Payload Info */}
                    {op.payload && (
                      <Box bg="$backgroundLight50" p="$2" borderRadius="$sm">
                        <Text size="xs" color="$textLight600" numberOfLines={2}>
                          {op.payload.display_name || op.payload.details || JSON.stringify(op.payload).slice(0, 80)}
                        </Text>
                      </Box>
                    )}

                    {/* Error Message */}
                    {op.status === "failed" && op.error_msg && (
                      <Box bg="$error50" p="$2" borderRadius="$sm">
                        <Text size="xs" color="$error700" numberOfLines={2}>
                          {op.error_msg.slice(0, 100)}...
                        </Text>
                      </Box>
                    )}

                    {/* Time Info */}
                    <HStack justifyContent="space-between" flexWrap="wrap">
                      <VStack>
                        <Text size="xs" color="$textLight400">创建</Text>
                        <Text size="xs">{formatTime(op.created_at)}</Text>
                      </VStack>
                      {op.finished_at && (
                        <VStack>
                          <Text size="xs" color="$textLight400">完成</Text>
                          <Text size="xs">{formatTime(op.finished_at)}</Text>
                        </VStack>
                      )}
                    </HStack>
                  </VStack>
                </Box>
              );
            }}
          />
        </VStack>
      </SafeAreaView>
    </Box>
  );
}
