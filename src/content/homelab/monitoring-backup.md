---
title: "Infrastructure Monitoring & Backup System"
description: "Monitoring virtual machines and infrastructure health while maintaining layered backups across the homelab for recovery and resilience."
order: 3
tags:
  - Monitoring
  - Backups
  - Beszel
  - Glances
  - SMTP
---

## Overview

As my homelab grew from a Raspberry Pi into a multi-node Proxmox environment, monitoring and backups became essential parts of operating it reliably. Running more than 100 containers and 10 virtual machines creates many possible failure points, from a full disk or overloaded VM to the loss of a host or storage device.

The Infrastructure Monitoring and Backup System combines centralized status monitoring, detailed per-VM visibility, automated alerts and multiple backup locations. Beszel provides a central view of virtual-machine resources, Glances supports deeper real-time inspection, and a local mail server delivers SMTP alerts when disk-space thresholds are reached.

The backup side follows a 3-2-1 strategy with daily scheduled snapshots for virtual machines and data. Copies are distributed across the two Proxmox hosts and the independent Raspberry Pi storage node, reducing dependence on any single physical machine.

## Goals

- Maintain a central view of resource usage across virtual machines.
- Inspect processes and system activity inside an individual VM when troubleshooting.
- Receive alerts before disk-space issues become service failures.
- Create daily recovery points for virtual machines and important data.
- Keep backup copies on independent physical systems.
- Reduce the impact of a host, VM or storage failure.
- Make infrastructure health and recovery part of normal homelab operations.

## System Architecture

The system uses separate tools for centralized monitoring, detailed troubleshooting, alert delivery and data protection. This keeps each part focused while allowing them to work together as a broader operational layer for the homelab.

| Layer | Components | Role |
| :--- | :--- | :--- |
| Central monitoring | Beszel | Displays VM resource usage and infrastructure status from one interface |
| Detailed inspection | Glances | Shows real-time utilization, processes and system activity inside individual VMs |
| Alerting | Local SMTP server | Delivers disk-space threshold notifications |
| Primary infrastructure | Proxmox hosts and TrueNAS | Runs workloads and stores primary VM and data copies |
| Secondary backup | Second Proxmox host and backup storage | Maintains recovery copies away from the primary host |
| Independent copy | Raspberry Pi storage node | Holds an additional synchronized copy of important NAS data |

## Centralized Monitoring with Beszel

Beszel provides the high-level monitoring view for the virtual-machine environment. Instead of opening each VM separately to check its condition, I can use a central interface to review resource usage across the infrastructure.

This view is useful for identifying machines that are approaching resource limits or behaving differently from their normal workload. It also provides a quick operational check after deploying a new service, changing a VM configuration or moving workloads between hosts.

Centralized monitoring does not replace host-level troubleshooting, but it shortens the path to the machine that needs attention. Once an issue is visible in Beszel, I can inspect that VM in more detail with Glances or the operating system's own tools.

## Real-Time VM Inspection with Glances

Glances runs at the individual virtual-machine level and provides real-time visibility into resource utilization, processes and system activity. It is useful when a central dashboard shows that a VM is under unusual load but does not explain what is causing it.

The detailed view helps connect infrastructure symptoms to activity inside the guest. High CPU usage, memory pressure or unexpected process behavior can be investigated directly without treating the VM as a single opaque resource on the Proxmox host.

Using Beszel and Glances together creates two levels of observability: a broad view for finding abnormal systems and a detailed view for investigating them.

## SMTP Alerting

Monitoring is most useful when it can report a developing problem without requiring someone to watch a dashboard continuously. Beszel is connected to the local mail server so it can send SMTP alerts when disk-space thresholds are reached.

Disk usage is a particularly important signal in a self-hosted environment. A full filesystem can interrupt applications, prevent logs from being written, stop databases from operating correctly or cause scheduled backups to fail.

The SMTP path keeps alert delivery within the existing homelab infrastructure. It also gives the local mail service a practical operational role beyond experimentation by using it for infrastructure notifications.

## Backup Strategy

The backup system follows the 3-2-1 principle: maintain three copies of important data, use more than one storage location or medium, and keep one copy separate from the primary system.

In this homelab, the primary workloads and data run across the Proxmox and TrueNAS environment. Backup copies are stored across independent physical machines, including the second Proxmox host and the Raspberry Pi storage node. Daily scheduled snapshots provide regular recovery points for virtual machines and data.

The two Proxmox hosts use separate VM ID ranges, with 10x IDs on the primary node and 20x IDs on the custom PC. This avoids naming conflicts when backups from both hosts are stored at the same destination and makes it easier to identify the source of each VM copy.

## Backup Layers

The system protects different parts of the environment through several complementary layers rather than relying on one backup destination.

### Virtual Machine Recovery Points

Daily scheduled snapshots create recovery points for the virtual machines. These help protect against unsuccessful configuration changes, damaged guest systems and other problems where restoring a known state is faster than rebuilding the VM manually.

### Cross-Host Copies

Storing VM backups away from their source host reduces dependence on the machine running the workload. If one Proxmox node becomes unavailable, the backup remains accessible from independent storage instead of being trapped on the affected host.

### NAS and Data Copies

The custom PC provides backup storage for data held by the primary NAS environment. The Raspberry Pi maintains an additional synchronized copy of important NAS data, adding another independent physical location to the backup strategy.

These layers serve different recovery scenarios. A VM snapshot can address a guest-level problem, while a copy on another physical machine provides a path forward when the original host or storage is unavailable.

## Monitoring the Backup Environment

Backups are only useful when the systems creating and storing them remain healthy. Monitoring disk usage is therefore directly connected to backup reliability.

Beszel's disk-space alerts can reveal a destination that is approaching capacity before a scheduled job runs out of room. Glances can then be used to inspect activity on the affected VM and determine whether growth is coming from application data, logs, temporary files or another workload.

This connection between monitoring and backups is important: monitoring detects conditions that could prevent a future recovery point, while the backup system provides protection when monitoring alone cannot prevent a failure.

## Recovery Considerations

A layered backup strategy improves resilience, but the presence of a backup file alone does not guarantee a successful recovery. Recovery planning also requires knowing which copy should be used, where it can be restored and what dependencies a service needs after restoration.

Separating copies across physical machines makes the failure boundaries clearer. A guest-level issue can be handled with a recent VM recovery point, while a host or storage failure requires a copy stored elsewhere in the environment.

The current system provides the infrastructure for those recovery paths. As the homelab continues to evolve, restoration testing and documenting service dependencies are natural areas for further improvement.

## Challenges & Lessons

The first challenge is balancing backup coverage with available storage. Virtual-machine images and data snapshots can grow quickly, so backup destinations need enough free space for scheduled jobs to continue operating. Disk-threshold alerts help identify this pressure before it becomes a failed backup.

The second challenge is avoiding a false sense of redundancy. A copy stored on the same physical machine as the source does not protect against the loss of that machine. Distributing copies between the two Proxmox hosts and the independent Raspberry Pi creates more meaningful separation.

Monitoring also works best at more than one level. A central dashboard is efficient for routine checks, but detailed VM-level inspection is still necessary when diagnosing a specific workload. Beszel and Glances address these different needs without forcing one tool to serve every use case.

Finally, alerts need a reliable delivery path. Connecting monitoring to the local SMTP server turns resource thresholds into actionable notifications and makes infrastructure issues visible before they require an emergency response.

## Conclusion

The Infrastructure Monitoring and Backup System adds an operational safety layer to the homelab. Beszel provides centralized visibility, Glances supports detailed investigation, and SMTP alerts report disk-space risks without requiring constant dashboard monitoring.

Daily scheduled snapshots and backup copies across independent physical systems provide recovery options for virtual machines and important data. Together, the monitoring and backup layers help the environment move beyond simply running services toward operating them with greater visibility, resilience and recoverability.

The system will continue to develop alongside the homelab, with future improvements focused on validating restores, refining alert thresholds and documenting recovery procedures for critical services.
