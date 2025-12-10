AUTODL_ENDPOINT_6006=https://u419643-928d-34da3290.westd.seetacloud.com:8443
AUTODL_ENDPOINT_6008=https://uu419643-928d-34da3290.westd.seetacloud.com:8443

conda run -n vsr PORT=6006 PUBLIC_BASE=$AUTODL_ENDPOINT_6006 IF_BASE=http://127.0.0.1:6008 python -m video_api.sr_api

conda run -n rife PORT=6008 PUBLIC_BASE=$AUTODL_ENDPOINT_6008 python -m video_api.if_api

PORT=6010 SR_BASE=http://127.0.0.1:6006 IF_BASE=http://127.0.0.1:6008 python -m video_api.main_api