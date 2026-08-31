---
title: "Distributed LAN Speed Monitoring with iperf3, InfluxDB & Grafana"
description: "Building a distributed full-mesh network performance monitoring system across Raspberry Pi and Proxmox nodes using iperf3, InfluxDB, Grafana and Portainer."
order: 4
tags:
  - Monitoring
  - Networking
  - Grafana
  - InfluxDB
  - iperf3
  - Docker
---

## Overview

As my homelab expanded from a single Raspberry Pi 5 into multiple Proxmox nodes, I needed a reliable way to measure the actual network performance between them. A link negotiating at 2.5 GbE does not necessarily mean that applications can transfer data at the same rate. Cabling, network adapters, switching, virtualization, container networking and host load can all affect the final result.

I built a distributed LAN speed monitoring system using iperf3, InfluxDB and Grafana. The system runs scheduled throughput tests between the Raspberry Pi, ASUS Proxmox host, custom PC Proxmox host and router-side network environment. Results are written to a central time-series database and displayed through a live Grafana dashboard.

The project initially measured every destination from a single collector on the Raspberry Pi. I later expanded it into a full directional mesh so that routes such as Pi → ASUS, ASUS → Pi, ASUS → PC and PC → ASUS are measured independently.

## Why I Built This

The homelab contains storage, backup, AI, Kubernetes, media and infrastructure workloads distributed across several physical machines. Network performance directly affects VM backups, NAS replication, container image transfers, media access and movement of AI models or datasets.

The main goals of this project were to:

- Verify that the upgraded LAN could sustain close to 2.5 GbE in both directions.
- Measure performance between individual physical nodes rather than relying only on interface link speed.
- Identify asymmetric routes where one direction performs differently from the other.
- Keep historical results so that cabling, adapter or switch problems can be detected over time.
- Monitor route availability in addition to throughput.
- Run the monitoring services through Portainer using repeatable Docker Compose stacks.
- Store all persistent application data under a single directory for easier backup and migration.

## Existing Homelab Hardware

The monitoring system is part of my three-node homelab infrastructure. Each physical machine has a different role, but all of them generate or consume enough network traffic to make end-to-end testing useful.

| Node | Hardware | Storage | Primary Role |
|---|---|---|---|
| ASUS Proxmox | ASUS NUC 14 Pro Plus, Core Ultra 5 125H, 64 GB DDR5-4800 | 2 TB Corsair NVMe, 4 TB Samsung 990 Pro | Primary NAS, infrastructure services, applications and testing |
| PC Proxmox | Custom PC, Core Ultra 7 265K, 64 GB DDR5-6000, RTX 3060 12 GB | 1 TB WD Blue NVMe, 8 TB Seagate IronWolf | AI workloads, NAS backup, Kubernetes and experimentation |
| Raspberry Pi | Raspberry Pi 5, 8 GB RAM | 256 GB SATA SSD, 1 TB + 1 TB + 2 TB HDD | Network services, VPN, reverse proxy and backup copy |

The monitored path is capable of 2.5 GbE. The Raspberry Pi uses a 2.5 GbE network interface for this path, while the ASUS and PC nodes connect through their 2.5 GbE interfaces. The router-side endpoint represents the network environment used for routing and infrastructure services.

## Network Topology

The physical nodes are connected to the same local network through the ISP router and an unmanaged switch. DHCP reservations provide consistent addresses, while AdGuard Home and Unbound provide internal DNS resolution for infrastructure names.

```text
                         Internet
                            │
                       ISP Router
                  Gateway, DHCP and routing
                            │
                    Unmanaged LAN Switch
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
  ASUS NUC 14 Pro      Custom PC       Raspberry Pi 5
      Proxmox            Proxmox        Service Node
          │                 │                 │
   Monitoring LXC     Monitoring LXC   Central Monitoring
   proxmox-asus       proxmox-pc       rpi5
          │                 │                 │
          └──────────── Router / Network LXC ┘
                         proxmox-router
```

The iperf3 endpoints use these internal names:

| Endpoint | Role |
|---|---|
| `rpi5` | Central monitoring node and Raspberry Pi test endpoint |
| `proxmox-asus` | iperf3 agent running in an LXC associated with the ASUS Proxmox environment |
| `proxmox-pc` | iperf3 agent running in an LXC associated with the PC Proxmox environment |
| `proxmox-router` | iperf3 agent running in the router or network-services environment |

Every name must resolve from inside the Docker containers. I use internal DNS where possible and Docker `extra_hosts` mappings as a fallback.

## Software Stack

The system uses four main components:

| Component | Purpose |
|---|---|
| iperf3 | Generates controlled TCP traffic and returns detailed JSON results |
| Collector | Runs scheduled tests, parses the JSON output and writes metrics to InfluxDB |
| InfluxDB 2 | Stores throughput, health, retransmit and timing data as time-series measurements |
| Grafana | Queries InfluxDB and displays route history, latest speed and health |
| Portainer | Deploys and manages the central and remote Docker Compose stacks |

InfluxDB and Grafana remain centralized on the Raspberry Pi. Lightweight mesh agents run in the ASUS, PC and router LXCs. Each agent acts as both an iperf3 server and an iperf3 client, allowing it to receive tests while also initiating tests toward the other nodes.

## From Central Testing to a Full Mesh

The first version ran only on the Raspberry Pi. For each destination, it performed a normal iperf3 test for upload and a reverse test for download:

```text
proxmox-asus upload    = Raspberry Pi → ASUS
proxmox-asus download  = ASUS → Raspberry Pi
```

This worked well for measuring every path that started or ended at the Pi. It could not measure ASUS → PC or PC → ASUS because iperf3 traffic must be initiated from one of those systems.

To cover every route, I deployed a small agent in each LXC and changed the data model from `destination + direction` to explicit `source + destination` tags. With four nodes, the number of directed routes is:

```text
n × (n - 1) = 4 × 3 = 12 routes
```

The resulting measurements include:

```text
rpi5 → proxmox-asus
proxmox-asus → rpi5
rpi5 → proxmox-pc
proxmox-pc → rpi5
proxmox-asus → proxmox-pc
proxmox-pc → proxmox-asus
```

The same structure also includes every route to and from `proxmox-router`.

## Test Scheduling

Running all agents at the same time would make the tests compete for bandwidth and produce misleading results. I therefore staggered the starting time for each source while keeping a common two-minute cycle.

| Source | Start Delay | Destinations |
|---|---:|---|
| `rpi5` | 0 seconds | ASUS, PC and router |
| `proxmox-asus` | 20 seconds | Pi, PC and router |
| `proxmox-pc` | 40 seconds | Pi, ASUS and router |
| `proxmox-router` | 60 seconds | Pi, ASUS and PC |

Each TCP test runs for five seconds with one parallel stream. Tests from the same source run sequentially with a short delay between destinations. This provides frequent measurements without continuously saturating the network.

The main agent settings are:

```yaml
IPERF_PORT: 5201
IPERF_DURATION: 5
IPERF_PARALLEL: 1
TEST_INTERVAL: 120
INTER_TEST_DELAY: 1
```

## Data Collection

iperf3 runs in JSON mode so the collector does not need to parse human-readable terminal output:

```sh
iperf3 --client proxmox-asus \
  --port 5201 \
  --time 5 \
  --parallel 1 \
  --connect-timeout 5000 \
  --json
```

For every successful test, the collector writes the following values to the `iperf3_mesh` measurement:

- Source and destination tags
- Protocol
- Bits per second
- Megabits per second
- Bytes transferred
- Test duration
- TCP retransmits
- Collector runtime
- Reachability status

Failures are also stored with `status=0` and a shortened error message. This allows the same dashboard to show both performance and connectivity problems.

A simplified InfluxDB point looks like this:

```text
iperf3_mesh,source=rpi5,destination=proxmox-asus,protocol=tcp \
status=1i,megabits_per_second=2357.0,retransmits=3i
```

## Portainer Deployment

The central Portainer stack runs InfluxDB, Grafana, the Raspberry Pi mesh agent and the Pi-side iperf3 server. The three remote stacks run only the lightweight mesh agent.

All persistent central data is stored below:

```text
/home/pi/docker/lan-speed/data/
├── grafana/
├── grafana-config/
├── influxdb/
└── influxdb-config/
```

I used direct bind paths in the Compose configuration rather than a top-level named `volumes` section. This keeps every persistent file inside one predictable directory.

The remote agents send results to the Pi over the local network:

```env
INFLUX_URL=http://PI_IP:8086
INFLUXDB_ORG=home
INFLUXDB_BUCKET=lan_speed
INFLUXDB_TOKEN=REDACTED
```

The token is configured through Portainer environment variables and is not stored in the published configuration. TCP port 5201 and the InfluxDB endpoint remain restricted to the trusted local network.

## Grafana Dashboard

Grafana is provisioned automatically with the InfluxDB data source and dashboard. The full-mesh dashboard contains three main views:

- **All directed LAN routes** — throughput history with series named `source → destination`.
- **Latest speed by route** — the most recent Mbps value for every selected path.
- **Route health** — whether the latest test succeeded or failed.

Source and Destination variables make it possible to view all 12 routes or narrow the dashboard to a smaller group such as Pi, ASUS and PC.

The dashboard refreshes every 30 seconds. InfluxDB remains the source of truth, so the time range can be expanded to compare current performance against previous hours or days.

## Results

The ASUS path sustained approximately 2.35 Gbps in both directions:

| Route | Latest Result | Mean Result |
|---|---:|---:|
| ASUS → Pi | 2353 Mbps | 2353 Mbps |
| Pi → ASUS | 2357 Mbps | 2357 Mbps |

Results between the other 2.5 GbE endpoints were also generally around 2.35 Gbps. This is consistent with expected application throughput on a 2.5 GbE link after Ethernet, IP and TCP overhead.

The result confirms end-to-end throughput rather than only interface negotiation. It verifies that the network adapters, cabling, switch path, operating systems and container networking can collectively sustain near-line-rate traffic.

## Challenges & Solutions

### Portainer Build Context

My first Compose stack referenced local `collector/` and `grafana/` build directories. When I pasted only the Compose file into Portainer's Web Editor, deployment failed because those directories did not exist in Portainer's stack workspace.

I solved this by creating a self-contained Web Editor stack based on official images. The collector and Grafana provisioning files are generated when the containers start, removing the dependency on external build contexts. Repository-based deployment remains an option when all project directories are committed together.

### Container Name Resolution

Hostnames that resolve on the Docker host do not always resolve inside containers, and containers do not automatically inherit custom entries from the host's `/etc/hosts` file.

I configured the agents to use internal DNS names and added optional `extra_hosts` mappings for environments where LAN DNS is unavailable.

### Misleading Raspberry Pi Result

The first dashboard showed the `rpi5` route at approximately 41-46 Gbps. That was not real LAN throughput. The collector was testing an iperf3 server on the same physical Pi, so the traffic stayed inside the host and measured the loopback or container networking path rather than the Ethernet interface.

This result demonstrated why endpoint placement matters. A device cannot accurately measure its own physical LAN performance by connecting back to itself. The distributed agents solve this by ensuring that every recorded route crosses between separate source and destination environments.

### Understanding Retransmits

The retransmit panel originally displayed a large value because it summed retransmits across every route and every test in the selected time range. I treated this as a range total rather than a current status value. Route-specific filters and the full-mesh source/destination tags make the value easier to interpret.

## Operational Considerations

iperf3 generates real traffic and temporarily consumes most of the available bandwidth on the tested path. A short interval is useful for initial validation, but continuous production monitoring should balance visibility against network load.

For normal operation I use short five-second tests, sequential execution and a two-minute cycle. The interval can be increased when the network is busy or when long-term trend monitoring is more important than rapid detection.

I also keep Grafana, InfluxDB and iperf3 restricted to the LAN. None of their ports need to be exposed directly to the public internet.

## Conclusion

This project turned a collection of manual iperf3 commands into a distributed monitoring system that continuously measures the real performance of the homelab network.

InfluxDB provides historical storage, Grafana makes route differences immediately visible, and the distributed agents make it possible to distinguish Pi → ASUS from ASUS → Pi or ASUS → PC from PC → ASUS. The measured throughput of approximately 2.35 Gbps confirms that the main paths are operating close to the practical limit of 2.5 GbE.

More importantly, the project exposed issues that a simple link-speed check would not reveal, including loopback measurements, container DNS behavior, deployment context and the effect of simultaneous tests. It now provides a reusable foundation for detecting performance regressions as the homelab network, storage systems and workloads continue to evolve.
