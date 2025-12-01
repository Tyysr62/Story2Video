package conf

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/spf13/viper"
)

type Server struct {
	Port         int    `mapstructure:"port"`
	Mode         string `mapstructure:"mode"`
	ReadTimeout  int    `mapstructure:"read_timeout"`
	WriteTimeout int    `mapstructure:"write_timeout"`
}

type Database struct {
	Host            string `mapstructure:"host"`
	Port            int    `mapstructure:"port"`
	User            string `mapstructure:"user"`
	Password        string `mapstructure:"password"`
	Name            string `mapstructure:"name"`
	SSLMode         string `mapstructure:"ssl_mode"`
	MaxOpenConns    int    `mapstructure:"max_open_conns"`
	MaxIdleConns    int    `mapstructure:"max_idle_conns"`
	ConnMaxLifetime int    `mapstructure:"conn_max_lifetime"`
}

type Redis struct {
	Host         string `mapstructure:"host"`
	Port         int    `mapstructure:"port"`
	Password     string `mapstructure:"password"`
	DB           int    `mapstructure:"db"`
	PoolSize     int    `mapstructure:"pool_size"`
	MinIdleConns int    `mapstructure:"min_idle_conns"`
}

type Pool struct {
	Size          int `mapstructure:"size"`
	ExpirySeconds int `mapstructure:"expiry_seconds"`
}

type GRPC struct {
	Addr        string `mapstructure:"addr"`
	DialTimeout int    `mapstructure:"dial_timeout"`
}

type ModelService struct {
	BaseURL string `mapstructure:"base_url"`
	Timeout int    `mapstructure:"timeout"`
}

type Kafka struct {
	Brokers           []string `mapstructure:"brokers"`
	Topic             string   `mapstructure:"topic"`
	Group             string   `mapstructure:"group"`
	Partitions        int      `mapstructure:"partitions"`
	ReplicationFactor int      `mapstructure:"replication_factor"`
	AutoCreateTopic   bool     `mapstructure:"auto_create_topic"`
}

type Config struct {
	Server       Server       `mapstructure:"server"`
	Database     Database     `mapstructure:"database"`
	Redis        Redis        `mapstructure:"redis"`
	Pool         Pool         `mapstructure:"pool"`
	GRPC         GRPC         `mapstructure:"grpc"`
	ModelService ModelService `mapstructure:"model_service"`
	Kafka        Kafka        `mapstructure:"kafka"`
}

func Load(path string) (*Config, error) {
	v := viper.New()
	if path != "" {
		v.SetConfigFile(path)
	} else {
		v.AddConfigPath("./config")
		v.SetConfigName("config")
	}
	v.SetConfigType("yaml")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}
	overrideFromEnv(&cfg)
	return &cfg, nil
}

func overrideFromEnv(cfg *Config) {
	setString := func(env string, target *string) {
		if val := strings.TrimSpace(os.Getenv(env)); val != "" {
			*target = val
		}
	}
	setInt := func(env string, target *int) {
		if val := strings.TrimSpace(os.Getenv(env)); val != "" {
			if num, err := strconv.Atoi(val); err == nil {
				*target = num
			}
		}
	}
	setBool := func(env string, target *bool) {
		if val := strings.TrimSpace(os.Getenv(env)); val != "" {
			if parsed, err := strconv.ParseBool(val); err == nil {
				*target = parsed
			}
		}
	}

	setString("SERVER_MODE", &cfg.Server.Mode)
	setInt("SERVER_PORT", &cfg.Server.Port)

	setString("DATABASE_HOST", &cfg.Database.Host)
	setInt("DATABASE_PORT", &cfg.Database.Port)
	setString("DATABASE_USER", &cfg.Database.User)
	setString("DATABASE_PASSWORD", &cfg.Database.Password)
	setString("DATABASE_NAME", &cfg.Database.Name)

	setString("REDIS_HOST", &cfg.Redis.Host)
	setInt("REDIS_PORT", &cfg.Redis.Port)
	setString("REDIS_PASSWORD", &cfg.Redis.Password)

	setInt("POOL_SIZE", &cfg.Pool.Size)
	setInt("POOL_EXPIRY_SECONDS", &cfg.Pool.ExpirySeconds)

	setString("GRPC_ADDR", &cfg.GRPC.Addr)
	setInt("GRPC_DIAL_TIMEOUT", &cfg.GRPC.DialTimeout)

	setString("MODEL_SERVICE_BASE_URL", &cfg.ModelService.BaseURL)
	setInt("MODEL_SERVICE_TIMEOUT", &cfg.ModelService.Timeout)

	if brokers := strings.TrimSpace(os.Getenv("KAFKA_BROKERS")); brokers != "" {
		cfg.Kafka.Brokers = strings.Split(brokers, ",")
	}
	setString("KAFKA_TOPIC", &cfg.Kafka.Topic)
	setString("KAFKA_GROUP", &cfg.Kafka.Group)
	setInt("KAFKA_PARTITIONS", &cfg.Kafka.Partitions)
	setInt("KAFKA_REPLICATION_FACTOR", &cfg.Kafka.ReplicationFactor)
	setBool("KAFKA_AUTO_CREATE_TOPIC", &cfg.Kafka.AutoCreateTopic)
}
