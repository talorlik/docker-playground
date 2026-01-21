FROM ubuntu:24.04 AS base

WORKDIR /app/app1/app2

COPY script.sh .

RUN chmod +x script.sh

RUN mkdir -p /data
RUN touch /data/file.txt

VOLUME ["/data"]
CMD ["sh", "-c", "script.sh"]
