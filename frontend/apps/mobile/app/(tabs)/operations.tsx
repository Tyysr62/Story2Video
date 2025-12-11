import React, { useState, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatList, RefreshControl } from "react-native";
import { router } from "expo-router";
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
import { useOperationsWithPolling, OperationStatus, OperationType } from "@story2video/core";
import type { Operation } from "@story2video/core";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function OperationsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "#e5e7eb" : "#4b5563";
  const pageBg = isDark ? "$backgroundDark950" : "$backgroundLight0";
  const refreshBg = isDark ? "$backgroundDark800" : "$backgroundLight100";
  const [filter, setFilter] = useState<OperationStatus | "all">("all");

  // 使用轮询 hook 获取真实数据
  const {
    operations,
    isLoading,
    pendingCount,
    refetchAll,
  } = useOperationsWithPolling({
    pollInterval: 5000, // 5秒轮询
  });

  // 根据筛选条件过滤任务
  const filteredOperations = useMemo(() => {
    if (filter === "all") return operations;
    return operations.filter((op) => op.status === filter);
  }, [operations, filter]);

  // 点击已完成的任务跳转到对应页面
  const handleOperationClick = (op: Operation) => {
    if (op.status !== OperationStatus.SUCCEEDED) return;
    
    switch (op.type) {
      case OperationType.STORY_CREATE:
        router.push(`/storyboard?storyId=${op.story_id}`);
        break;
      case OperationType.VIDEO_RENDER:
        router.push(`/preview?storyId=${op.story_id}`);
        break;
      case OperationType.SHOT_REGEN:
        router.push(`/shot/${op.shot_id}?storyId=${op.story_id}`);
        break;
    }
  };

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
        bg={filter === value ? "$primary500" : (isDark ? "$backgroundDark800" : "$backgroundLight100")}
        px="$3"
        py="$2"
        borderRadius="$full"
      >
        <Text
          size="sm"
          color={filter === value ? "$white" : (isDark ? "$textDark100" : "$textLight700")}
          fontWeight={filter === value ? "$bold" : "$normal"}
        >
          {label}
        </Text>
      </Box>
    </Pressable>
  );

  return (
    <Box flex={1} bg={pageBg}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <VStack space="md" flex={1} p="$4">
          <HStack justifyContent="space-between" alignItems="center">
            <VStack space="xs" flex={1}>
              <Heading size="xl">任务列表</Heading>
              <Text size="sm" color="$textLight500" _dark={{ color: "$textDark300" }}>
                查看所有任务的执行状态
                {pendingCount > 0 && ` (${pendingCount} 个进行中)`}
              </Text>
            </VStack>
            <Pressable onPress={refetchAll} disabled={isLoading}>
              <Box
                w="$10"
                h="$10"
                bg={refreshBg}
                borderRadius="$full"
                alignItems="center"
                justifyContent="center"
              >
                {isLoading ? (
                  <Spinner size="small" />
                ) : (
                  <FontAwesome name="refresh" size={16} color={iconColor} />
                )}
              </Box>
            </Pressable>
          </HStack>

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
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={refetchAll} />
            }
            ListEmptyComponent={
              <Box p="$8" alignItems="center">
                <Text color="$textLight400" _dark={{ color: "$textDark300" }}>
                  {operations.length === 0 ? "暂无任务，创建故事后任务将显示在这里" : "没有符合筛选条件的任务"}
                </Text>
              </Box>
            }
            renderItem={({ item: op }) => {
              const statusInfo = getStatusBadge(op.status);
              const typeIcon = getTypeIcon(op.type);
              const isClickable = op.status === OperationStatus.SUCCEEDED;

              return (
                <Pressable
                  onPress={() => handleOperationClick(op)}
                  disabled={!isClickable}
                >
                  <Box
                    bg="$white"
                    borderRadius="$lg"
                    borderColor={isClickable ? "$primary200" : "$borderLight200"}
                    borderWidth={1}
                    p="$3"
                    shadowColor="$black"
                    shadowOffset={{ width: 0, height: 1 }}
                    shadowOpacity={0.05}
                    shadowRadius={2}
                    elevation={1}
                    _dark={{
                      bg: "$backgroundDark900",
                      borderColor: isClickable ? "$primary500" : "$borderDark700",
                    }}
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
                          _dark={{ bg: "$backgroundDark800" }}
                        >
                          <FontAwesome name={typeIcon} size={16} color={iconColor} />
                        </Box>
                        <VStack flex={1}>
                          <Text fontWeight="$bold" size="sm" numberOfLines={1}>
                            {getTypeLabel(op.type)}
                          </Text>
                          <Text size="xs" color="$textLight400" _dark={{ color: "$textDark300" }}>
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
                          {op.status === "running" || op.status === "queued" ? (
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
                      <Box
                        bg="$backgroundLight50"
                        p="$2"
                        borderRadius="$sm"
                        _dark={{ bg: "$backgroundDark800" }}
                      >
                        <Text
                          size="xs"
                          color="$textLight600"
                          _dark={{ color: "$textDark200" }}
                          numberOfLines={2}
                        >
                          {op.payload.display_name || op.payload.details || JSON.stringify(op.payload).slice(0, 80)}
                        </Text>
                      </Box>
                    )}

                    {/* Error Message */}
                    {op.status === "failed" && op.error_msg && (
                      <Box
                        bg="$error50"
                        p="$2"
                        borderRadius="$sm"
                        _dark={{ bg: "$error900" }}
                      >
                        <Text
                          size="xs"
                          color="$error700"
                          _dark={{ color: "$error100" }}
                          numberOfLines={2}
                        >
                          {op.error_msg.slice(0, 100)}...
                        </Text>
                      </Box>
                    )}

                    {/* Time Info */}
                    <HStack justifyContent="space-between" flexWrap="wrap">
                      <VStack>
                        <Text size="xs" color="$textLight400" _dark={{ color: "$textDark300" }}>
                          创建
                        </Text>
                        <Text size="xs">{formatTime(op.created_at)}</Text>
                      </VStack>
                      {op.finished_at && (
                        <VStack>
                          <Text size="xs" color="$textLight400" _dark={{ color: "$textDark300" }}>
                            完成
                          </Text>
                          <Text size="xs">{formatTime(op.finished_at)}</Text>
                        </VStack>
                      )}
                    </HStack>
                  </VStack>
                  </Box>
                </Pressable>
              );
            }}
          />
        </VStack>
      </SafeAreaView>
    </Box>
  );
}
