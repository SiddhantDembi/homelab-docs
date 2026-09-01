---
title: "Proxmox Homelab Infrastructure"
description: "Building and operating a three-node on-premise environment for self-hosted services, infrastructure development and experimentation."
order: 1
tags:
  - Infrastructure
  - Proxmox
  - Kubernetes
  - Networking
---

## Overview

What started as a single Raspberry Pi 5 used for my first year of homelab experimentation has evolved into a multi-node on-premise infrastructure spanning two independent Proxmox hosts and a dedicated Raspberry Pi service node.

The environment is built primarily for self-hosted services, infrastructure development, virtualization, networking, AI workloads and experimentation. The two Proxmox hosts run virtual machines and TrueNAS instances, while the Raspberry Pi provides additional network services and an independent backup copy of important NAS data.

The infrastructure currently supports more than 100 containers and 10 virtual machines, along with a three-node K3s Kubernetes cluster, local AI workloads, NAS storage, network services and remote-access infrastructure.

## Goals

- Build an on-premise environment for experimenting with virtualization, containers, Kubernetes, networking and self-hosted services.
- Reduce reliance on cloud infrastructure by running applications, storage and AI workloads locally.
- Create a flexible environment where new VMs, containers and services can be provisioned and tested without affecting critical workloads.
- Maintain independent storage and backup paths across multiple physical machines for better resilience and recovery.
- Provide secure remote access to selected services without directly exposing internal services to the public internet.

## Architecture

The current infrastructure consists of two independent Proxmox hosts connected to the same local network, along with a Raspberry Pi 5 that operates independently from the virtualization environment.

The first Proxmox host is an ASUS NUC 14 Pro Plus and acts as the primary infrastructure node, hosting services such as TrueNAS, networking, applications, SMTP and testing workloads. The second host is a custom-built PC with a dedicated NVIDIA GPU and additional storage, primarily used for AI workloads, backups, Kubernetes experimentation and other compute-heavy workloads.

The Raspberry Pi 5 started as my original and only homelab server during 2024-2025. It now serves as an independent network and backup service node, providing additional reverse-proxy and VPN capabilities as well as an occasional synchronized copy of NAS data.

<div class="architecture-diagram">
  <div class="diagram-box">Internet</div>
  <div class="diagram-line"></div>
  <div class="diagram-box">ISP Router</div>
  <div class="diagram-line"></div>
  <div class="diagram-box">Unmanaged Switch</div>
  <div class="diagram-line"></div>
  <div class="nodes">
    <div class="node">
      <strong>Node 1</strong>
      <span>ASUS NUC 14 Pro Plus</span>
      <small>Proxmox</small>
      <small>TrueNAS</small>
      <small>Network Services</small>
      <small>Applications &amp; Testing</small>
    </div>
    <div class="node">
      <strong>Node 2</strong>
      <span>Custom PC</span>
      <small>Proxmox</small>
      <small>TrueNAS Backup</small>
      <small>AI Workloads</small>
      <small>K3s Cluster</small>
    </div>
    <div class="node">
      <strong>Node 3</strong>
      <span>Raspberry Pi 5</span>
      <small>Raspberry Pi OS</small>
      <small>VPN &amp; Reverse Proxy</small>
      <small>NAS Backup Copy</small>
    </div>
  </div>
</div>

## Hardware

The infrastructure is distributed across three physical machines, each serving a different role based on its compute, storage and networking capabilities.

| Node | Hardware | Storage | Primary Role |
| :--- | :--- | :--- | :--- |
| Node 1 | ASUS NUC 14 Pro Plus<br />Core Ultra 5 125H<br />64 GB DDR5-4800 | 2 TB Corsair NVMe<br />4 TB Samsung 990 Pro | Primary NAS, infrastructure services, applications and testing |
| Node 2 | Custom PC<br />Core Ultra 7 265K<br />64 GB DDR5-6000<br />RTX 3060 12 GB | 1 TB WD Blue NVMe<br />8 TB Seagate IronWolf | AI workloads, NAS backup, Kubernetes and experimentation |
| Node 3 | Raspberry Pi 5<br />8 GB RAM | 256 GB SATA SSD<br />1 TB + 1 TB + 2 TB HDD | Network services, VPN, reverse proxy and backup copy |

## Virtual Machines & Containers

The two Proxmox hosts use virtual machines to isolate services and workloads by function. This keeps infrastructure services, applications, storage and experimental workloads separated while allowing resources to be allocated independently.

The ASUS NUC hosts the primary infrastructure workloads, including TrueNAS, media, applications, networking, Minecraft, SMTP and testing. The custom PC hosts the AI environment, backup storage, autonomous agent, and a three-VM K3s Kubernetes cluster.

VM IDs use a 10x and 20x numbering scheme to avoid conflicts when storing backups from both Proxmox hosts at the same destination.

<div class="vm-grid">
  <div class="vm-host">
    <div class="vm-host-header">
      <span class="vm-number">NODE 1</span>
      <h3>Proxmox - ASUS NUC</h3>
    </div>
    <div class="vm-list">
      <div class="vm-item">
        <strong>100 - TrueNAS</strong>
        <span>Primary NAS and storage services</span>
      </div>
      <div class="vm-item">
        <strong>102 - Media</strong>
        <span>Media-related services</span>
      </div>
      <div class="vm-item">
        <strong>103 - Apps</strong>
        <span>Self-hosted applications</span>
      </div>
      <div class="vm-item">
        <strong>104 - Network</strong>
        <span>Network services including AdGuard Home and Unbound</span>
      </div>
      <div class="vm-item">
        <strong>105 - Minecraft</strong>
        <span>Minecraft server workload</span>
      </div>
      <div class="vm-item">
        <strong>106 - SMTP</strong>
        <span>Mail and SMTP services</span>
      </div>
      <div class="vm-item">
        <strong>107 - Test</strong>
        <span>Testing and experimentation</span>
      </div>
      <div class="vm-item lxc">
        <strong>108 - Monitor</strong>
        <span>LXC for host temperature and resource monitoring</span>
      </div>
    </div>
  </div>
  <div class="vm-host">
    <div class="vm-host-header">
      <span class="vm-number">NODE 2</span>
      <h3>Proxmox - Custom PC</h3>
    </div>
    <div class="vm-list">
      <div class="vm-item">
        <strong>203 - AI</strong>
        <span>GPU-accelerated local AI workloads</span>
      </div>
      <div class="vm-item">
        <strong>204 - TrueNAS Backup</strong>
        <span>Backup storage and NAS workloads</span>
      </div>
      <div class="vm-item">
        <strong>205 - Agent</strong>
        <span>Hermes Agent and local AI models</span>
      </div>
      <div class="vm-item">
        <strong>206 - K3s Node 1</strong>
        <span>Kubernetes cluster node</span>
      </div>
      <div class="vm-item">
        <strong>207 - K3s Node 2</strong>
        <span>Kubernetes cluster node</span>
      </div>
      <div class="vm-item">
        <strong>208 - K3s Node 3</strong>
        <span>Kubernetes cluster node</span>
      </div>
      <div class="vm-item lxc">
        <strong>201 - Monitor-PC</strong>
        <span>LXC for host temperature and resource monitoring</span>
      </div>
    </div>
  </div>
</div>

<div class="templates-note">
  <strong>VM Templates</strong>
  <span>Both hosts maintain an Ubuntu template for quickly provisioning new virtual machines.</span>
</div>

## Networking

The homelab uses the ISP-provided router as the primary gateway and DHCP server, with all physical nodes and virtual machines connected through an unmanaged network switch.

DHCP reservations are used to assign consistent local IP addresses to infrastructure services and devices. The router is configured to use the Network VM's IP address as the custom DNS server, allowing devices on the network to resolve internal services through AdGuard Home and Unbound.

Services that require direct inbound connectivity use port forwarding on the ISP router to route traffic to the appropriate internal services. Public-facing HTTP and HTTPS services are additionally exposed through Cloudflare Tunnel, avoiding the need to directly expose those services through the router.

<div class="network-flow">
  <div class="network-box">
    <strong>Internet</strong>
    <span>ISP</span>
  </div>
  <div class="network-arrow">↓</div>
  <div class="network-box">
    <strong>ISP Router</strong>
    <span>Gateway + DHCP + Port Forwarding</span>
  </div>
  <div class="network-arrow">↓</div>
  <div class="network-box">
    <strong>Unmanaged Switch</strong>
    <span>Local Network</span>
  </div>
  <div class="network-arrow">↓</div>
  <div class="network-services">
    <div class="network-box">
      <strong>Network VM</strong>
      <span>AdGuard Home + Unbound</span>
    </div>
    <div class="network-box">
      <strong>Proxmox Nodes</strong>
      <span>VMs + Containers</span>
    </div>
    <div class="network-box">
      <strong>Raspberry Pi 5</strong>
      <span>VPN + Reverse Proxy</span>
    </div>
  </div>
</div>

## Remote Access

I initially experimented with an NGINX reverse proxy to access self-hosted services remotely. I later switched to Cloudflare Tunnel because it offered a more convenient way to publish selected services without managing individual public-facing reverse-proxy configurations.

Cloudflare Tunnel runs as Docker containers on both the Network VM and Raspberry Pi 5. I use subdomains to provide remote access to the local HTTP and HTTPS services that I choose to expose.

For direct access to the home network rather than individual services, I use Twingate to establish a private connection into the homelab. I have also experimented with WireGuard as an alternative VPN-based approach for remote network access.

<div class="remote-access-grid">
  <div class="remote-access-card">
    <strong>Cloudflare Tunnel</strong>
    <span>Remote access to selected services through subdomains</span>
  </div>
  <div class="remote-access-card">
    <strong>Twingate</strong>
    <span>Private remote access to the home network</span>
  </div>
  <div class="remote-access-card">
    <strong>WireGuard</strong>
    <span>Experimental VPN-based remote access</span>
  </div>
</div>

## Challenges & Solutions

Building the homelab incrementally introduced several challenges around resource allocation, service isolation, remote access and maintaining reliable backups across independent systems.

As the number of workloads increased, separating services into dedicated VMs made it easier to manage resources and isolate failures. The second Proxmox host also provided additional compute and storage capacity for workloads that would otherwise compete with the primary infrastructure.

Remote access was another area that evolved over time. After initially experimenting with an NGINX reverse proxy, I moved to Cloudflare Tunnel for simpler service exposure through subdomains, while using Twingate for private access to the home network.

Maintaining independent storage across both Proxmox hosts also allowed me to implement cross-host VM backups, reducing dependence on a single physical machine and providing a recovery path in case of host failure.

The homelab continues to serve as an experimental environment, allowing new infrastructure technologies and architectures to be tested without requiring changes to the core services.

## Conclusion

The homelab has evolved from a single Raspberry Pi 5 into a distributed on-premise environment spanning two Proxmox hosts and an independent Raspberry Pi service node.

It now provides the foundation for self-hosted applications, NAS storage, Kubernetes, local AI, networking, remote access and infrastructure experimentation. More importantly, operating the environment end to end has provided practical experience with virtualization, Linux, containers, networking, storage, monitoring, backups and service deployment.

The infrastructure remains an ongoing project, with new services and technologies continuously being introduced, tested and integrated as I expand the capabilities of the homelab.
