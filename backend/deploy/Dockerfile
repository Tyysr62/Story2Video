FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG TARGETOS=linux
ARG TARGETARCH=amd64
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o server ./cmd

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata ffmpeg

WORKDIR /srv/story2video
COPY --from=builder /app/server .
COPY --from=builder /app/config ./config
ENV TZ=Asia/Shanghai
EXPOSE 8080
CMD ["./server"]
