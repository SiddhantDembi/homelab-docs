---
title: "Running OPNsense as a Double-NAT Router on Proxmox"
description: "Building a reliable OPNsense VM behind an ISP router, preserving an existing homelab subnet, restoring DHCP reservations and publishing selected services through two NAT layers."
order: 5
tags:
  - OPNsense
  - Proxmox
  - Networking
  - Firewall
  - Virtualization
---

## Overview

I deployed OPNsense as a virtual router on Proxmox while retaining the ISP-provided router in its normal routing mode. This creates two independent private networks and two layers of IPv4 NAT:

```text
Internet
   │
ISP router
Upstream private network + DHCP + NAT
   │
OPNsense WAN on a dedicated Proxmox bridge
   │
OPNsense firewall + NAT
   │
OPNsense LAN on a separate Proxmox bridge
   │
Unmanaged switch
   │
Proxmox management, servers and clients
```

The ISP router continues serving devices connected directly to it. OPNsense serves a separate downstream network containing my homelab equipment. This approach was useful because it did not require ISP bridge-mode support, PPPoE credentials or provider-specific VLAN information.

## Goals

- Keep the ISP router operational while placing the homelab behind OPNsense.
- Give the WAN and LAN completely separate physical and virtual paths.
- Make OPNsense the DHCP, DNS, firewall and default gateway for downstream devices.
- Keep Proxmox management reachable from the downstream LAN.
- Preserve established server addresses and reverse-proxy origins during migration.
- Use IPv4 only for this deployment.
- Preserve console access and backups throughout the migration.
- Confirm the design survives both an OPNsense restart and a complete Proxmox reboot.

## Example Address Plan

The values below are examples. They should be replaced with addresses appropriate for each environment.

| Purpose | Example |
|---|---|
| ISP-router network | `192.168.0.0/24` |
| ISP-router gateway | `192.168.0.1` |
| OPNsense WAN reservation | `192.168.0.10/24` |
| OPNsense LAN network | `192.168.1.0/24` |
| OPNsense LAN gateway | `192.168.1.1` |
| Proxmox management | `192.168.1.2` |
| Downstream DHCP pool | `192.168.1.100–192.168.1.200` |

The upstream and downstream subnets must be different. Using `192.168.1.0/24` on both sides would create overlapping routes and prevent OPNsense from operating as a normal router.

## Preserving an Existing Homelab Subnet

An important refinement was keeping the established downstream subnet instead of renumbering every server. Existing static addresses, DHCP reservations and tunnel origins already depended on that network.

The safe sequence was:

1. Export the firewall configuration and create a hypervisor snapshot.
2. Temporarily move OPNsense LAN, Proxmox management and an administrator client to an unused staging subnet.
3. Move the ISP router to a different upstream subnet.
4. Reserve a stable upstream address for OPNsense WAN.
5. Return OPNsense LAN and Proxmox management to the established homelab subnet.
6. Restore DHCP reservations before widening the dynamic pool.

The staging subnet prevented either router from using overlapping networks during the transition. This approach preserved internal service addresses and avoided editing every reverse-proxy origin.

## Hardware Layout

The Proxmox host has two physical network interfaces:

- An onboard 1 GbE interface used only for OPNsense WAN.
- A faster interface used for OPNsense LAN, Proxmox management and the downstream switch.

```text
ISP router LAN port
        │
        ▼
Physical WAN NIC
        │
Dedicated WAN bridge
        │
OPNsense virtual WAN

OPNsense virtual LAN
        │
LAN/management bridge
        │
Physical LAN NIC
        │
Unmanaged switch
        ├── Proxmox management
        ├── Laptop
        └── Homelab servers
```

The ISP router must not also be connected to the downstream switch. Doing so would merge both broadcast domains and expose clients to competing DHCP servers.

## Why Both Routers Run DHCP

Both DHCP servers remain enabled, but each serves a different Layer-2 network:

- The ISP router assigns upstream addresses to its Wi-Fi and directly connected clients.
- OPNsense assigns downstream addresses to devices connected through its LAN switch.

A device connected to the ISP router therefore receives an upstream address. The same device connected to the OPNsense-side switch receives a downstream address. This is expected and is one of the easiest ways to verify the physical separation.

## Step 1: Create Recovery Points

Before changing any addresses:

1. Export the current OPNsense configuration.
2. Create a Proxmox snapshot or backup of the firewall VM.
3. Verify the OPNsense console opens from Proxmox.
4. Record the current interface assignments and virtual MAC addresses.
5. Prepare a temporary static client address in the future LAN subnet.

The console is essential. Changing the firewall LAN address will intentionally disconnect the existing browser session.

## Step 2: Build the Proxmox Bridges

Create or verify two independent Linux bridges.

### WAN bridge

- Attach only the physical NIC connected to the ISP router.
- Do not assign the Proxmox host an IPv4 or IPv6 address on this bridge.
- Do not configure a gateway on this bridge.
- Enable bridge autostart.
- Attach the OPNsense WAN virtual adapter to it.

### LAN and management bridge

- Attach only the physical NIC connected to the downstream switch.
- Assign the Proxmox management address from the downstream subnet.
- Set OPNsense LAN as the Proxmox default gateway.
- Enable bridge autostart.
- Attach the OPNsense LAN virtual adapter to it.

The host should have only one default IPv4 gateway. In this design that gateway is OPNsense LAN, not the ISP router.

## Step 3: Assign the OPNsense Interfaces

Match the VM adapters to the bridges using the virtual MAC addresses:

| OPNsense role | VM adapter | Proxmox bridge |
|---|---|---|
| LAN | First trusted adapter | LAN/management bridge |
| WAN | ISP-facing adapter | WAN bridge |

Verify this mapping before applying addressing. Accidentally reversing WAN and LAN can expose the management interface to an untrusted network or lock the administrator out.

## Step 4: Configure the OPNsense LAN

Use the OPNsense console if the current web-interface address overlaps with the upstream network:

1. Select the console option for setting an interface IP address.
2. Select the LAN interface.
3. Assign the downstream gateway address and prefix.
4. Do not configure an upstream gateway on LAN.
5. Configure IPv6 according to the intended design.
6. Apply a temporary static address from the new subnet to the administrator's laptop.
7. Reopen OPNsense at its new LAN address.
8. Move the Proxmox management address and gateway into the same downstream subnet.

At this point, local management should work even though the WAN and DHCP services may not yet be ready.

## Step 5: Configure Downstream DHCP and DNS

Use one OPNsense DHCP service for the LAN. Depending on the installed OPNsense version, this may be Dnsmasq, Kea or another supported service.

For the example plan:

- Interface: LAN
- Pool: `192.168.10.100–192.168.10.200`
- Mask: `/24`
- Router: `192.168.10.1`
- DNS server: `192.168.10.1`
- Lease time: one day

Delete DHCP ranges belonging to the old LAN subnet. If the network is intentionally IPv4-only, also delete any DHCPv6 range and disable Router Advertisements.

My installation uses Dnsmasq for DHCP and Unbound for client DNS. Dnsmasq listens on an alternate local port while clients use OPNsense on port 53 through Unbound. The important client result is:

```text
Address:    downstream subnet
Mask:       correct subnet mask
Router:     OPNsense LAN address
DNS server: OPNsense LAN address
```

After creating the pool, return the test client to DHCP and renew its lease.

### Restore reservations before expanding DHCP

Use a deliberately narrow temporary pool while migrating an established network. Export one demonstration host entry from Dnsmasq to learn the exact CSV schema, prepare the remaining reservations offline, then import and apply them in bulk.

The migration order matters:

1. Create a small non-conflicting dynamic pool.
2. Import reservations for infrastructure, servers and hypervisor hosts.
3. Renew leases in controlled batches.
4. Confirm each reserved device returns on its intended address.
5. Expand the dynamic pool only after checking for overlaps with static addresses.

For Linux containers configured for DHCP, the reservation belongs to the container's virtual NIC MAC address. A blank Proxmox console after a network change may simply need Enter pressed a few times before the login prompt is redrawn.

## Step 6: Configure the OPNsense WAN for Double NAT

Connect the physical WAN NIC to a LAN port on the ISP router, then configure the OPNsense WAN interface:

- Enable the interface.
- IPv4 Configuration Type: DHCP.
- IPv6 Configuration Type: None for an IPv4-only design.
- Uncheck **Block private networks**.
- Leave MTU and MSS at their defaults unless the ISP requires otherwise.
- Leave the MAC override blank unless the provider locks service to a particular MAC.

The private-networks option must be unchecked because an RFC1918 WAN address is legitimate in a double-NAT deployment.

After applying, confirm that WAN receives:

- An address from the ISP router's LAN subnet.
- The ISP router as its gateway.
- A default IPv4 route.

Create a DHCP reservation on the ISP router for the OPNsense WAN MAC. A stable WAN address makes future port forwarding, monitoring and troubleshooting much easier.

## Step 7: Configure IPv4 NAT and Firewall Rules

For a standard single-WAN deployment, automatic outbound source NAT is normally sufficient:

- Source NAT mode: Automatic.
- Source: downstream LAN network.
- Translation: OPNsense WAN address.

Retain an IPv4 LAN rule that permits the intended outbound traffic. A simple initial rule is:

- Interface: LAN
- Direction: In
- Action: Pass
- IP version: IPv4
- Protocol: Any
- Source: LAN network
- Destination: Any
- Gateway: Default

Do not add a broad inbound allow rule on WAN. Inbound services should be introduced later through explicit destination-NAT and firewall rules.

## Step 8: Disable IPv6 When Intentionally Using IPv4 Only

This project intentionally disabled routed IPv6:

1. Set LAN IPv6 configuration to None.
2. Set WAN IPv6 configuration to None.
3. Remove DHCPv6 ranges.
4. Disable Router Advertisements.
5. Enable the global **Turn off IPv6** option under interface settings.

Loopback entries such as `::1` or `fe80::` can still appear in diagnostic pages. These local-only values do not mean IPv6 is being advertised to clients.

IPv6 should not be disabled automatically in every deployment. A properly delegated and firewalled IPv6 prefix is preferable when the ISP and local design support it.

## Step 9: Apply Virtualization-Friendly Interface Settings

OPNsense recommends disabling hardware offloading features for virtual installations. Under **Interfaces → Settings**, enable:

- Disable hardware checksum offload
- Disable hardware TCP segmentation offload
- Disable hardware large receive offload

Leave VLAN hardware filtering at its safe default unless the virtual-switch and VLAN design specifically require another setting.

See the official [OPNsense virtual installation guidance](https://docs.opnsense.org/manual/virtuals.html) and [interface settings reference](https://docs.opnsense.org/manual/interfaces_settings.html).

## Step 10: Configure Proxmox DNS and Startup Order

Configure the Proxmox host to use OPNsense LAN as its DNS server and default gateway. Use a private search domain that does not conflict with multicast DNS.

Set the OPNsense VM to start automatically:

- Start at boot: Yes
- Start order: first among network-dependent guests
- Startup delay: approximately 30 seconds

The delay gives OPNsense time to establish WAN, DNS, DHCP and firewall services before later guests start.

## Step 11: Validate in Layers

Test each layer separately so failures are easy to locate.

### From OPNsense

1. Ping the ISP-router gateway.
2. Ping a public IPv4 address.
3. Perform a DNS lookup.

### From a downstream client

1. Confirm the client received a downstream address.
2. Confirm its router is OPNsense LAN.
3. Confirm its DNS server is OPNsense LAN.
4. Open the OPNsense management page.
5. Open the Proxmox management page.
6. Open a public IP-based site.
7. Open a domain-based site.

Testing an IP address before a domain distinguishes routing/NAT failures from DNS failures.

## Step 12: Test Persistence

Two restart tests completed the project:

1. Reboot only the OPNsense VM and repeat the connectivity tests.
2. Reboot the entire Proxmox host and verify OPNsense starts automatically.
3. Reboot representative hypervisors, servers and DHCP-based containers after their reservations are restored.

After the full host restart, confirm the reserved OPNsense WAN address, downstream DHCP, DNS resolution, internet access and both management interfaces.

Export another OPNsense configuration after the working state has been confirmed.

## Expected Network Behavior

The ISP router normally sees only the OPNsense WAN interface, not every downstream client. Source NAT hides the downstream addresses behind the OPNsense WAN address.

Downstream clients can initiate permitted connections toward the internet and usually toward the upstream private network. Upstream clients cannot initiate arbitrary connections into the downstream LAN because OPNsense treats that traffic as unsolicited WAN traffic.

This separation is a feature, not a discovery failure.

## Publishing Services Through Two NAT Layers

No inbound exposure is required for ordinary outbound internet use. When an internal service must be published, use one of these approaches:

### Two explicit port forwards

```text
Public port on ISP router
  → OPNsense reserved WAN address
  → matching OPNsense port forward
  → downstream server
```

Create and test each service independently:

1. On the ISP router, forward the required public protocol and port to the reserved OPNsense WAN address.
2. In **Firewall → NAT → Destination NAT**, create the matching WAN rule.
3. Use `WAN address` as the destination.
4. Translate to the final internal host and port.
5. Register the associated firewall rule rather than adding a broad WAN allow rule.
6. Apply the configuration and test from a genuinely external network.

A representative final rule set can include:

| Service | Protocol | Public port | OPNsense target |
|---|---|---:|---|
| WireGuard | UDP | VPN listen port | VPN server |
| SMTP | TCP | `25` | Mail server |
| SMTPS | TCP | `465` | Mail server |
| SMTP submission | TCP | `587` | Mail server |
| IMAPS | TCP | `993` | Mail server |
| DNS over HTTPS | TCP | `443` | DNS service |
| DNS over TLS | TCP | `853` | DNS service |

Port-forwarding tests should prove more than an open socket. A packet capture at the final server shows whether the request traversed both routers and whether the application replied. For SMTP, a complete banner and `EHLO` exchange is stronger evidence than a generic port checker.

### Cloudflare Tunnel and direct DNS records

HTTP applications published through Cloudflare Tunnel do not need inbound port forwards because `cloudflared` establishes outbound connections. Preserving the original LAN subnet also preserves the tunnel's internal origin addresses.

Raw services require different handling:

- Mail hostnames and other directly reached TCP/UDP services must use appropriate DNS-only records unless a compatible Layer-4 proxy is configured.
- A DNS record maps a hostname to an address; it does not automatically include a custom application port.
- Standard public-hostname tunnels do not provide transparent clientless UDP for arbitrary games.
- Minecraft Bedrock is particularly unsuitable for this path, so keeping it internal-only or reaching it through a VPN can be safer and simpler.

### Mail port 80 and certificate renewal

SMTP delivery does not require inbound TCP `80`. Mailcow's default Let's Encrypt HTTP-01 validation does, however. Before leaving port `80` closed, configure DNS-01 validation or an external certificate-renewal workflow that installs and reloads Mailcow's certificates. Successful mail delivery today does not prove that future TLS renewal will succeed.

### Test from outside, not through hairpin NAT

Connecting to the public address while still on the home Wi-Fi tests NAT reflection, not ordinary inbound forwarding. Disable Wi-Fi and any VPN, use cellular data or an external hotspot, and confirm the observed source address is not from the LAN subnet. For convenient access to public hostnames while at home, prefer split DNS over globally enabling NAT reflection.

### Upstream DMZ toward OPNsense

Some ISP routers can send unsolicited inbound traffic to the OPNsense WAN address. OPNsense then becomes the effective inbound firewall, but the ISP router still performs address translation.

Only use this after the OPNsense WAN address is reserved and its firewall policy is understood. Never expose the OPNsense or Proxmox administrative interfaces directly to the internet. A VPN is preferable for administration.

## Double NAT Versus Bridge Mode and PPPoE

| Capability | Double NAT behind ISP router | ISP bridge mode + PPPoE on OPNsense |
|---|---|---|
| Requires ISP bridge support | No | Yes |
| Requires PPPoE credentials or ISP VLAN details | No | Usually |
| OPNsense holds the public IPv4 address | No | Yes |
| NAT layers | Two | One |
| Normal outbound access | Straightforward | Straightforward |
| Inbound port forwarding | Required on two devices, or via upstream DMZ | Managed only by OPNsense |
| Gaming and NAT-sensitive protocols | Can be more troublesome | Generally simpler |
| Firewall visibility | Complete only for downstream clients | Complete for all clients placed behind OPNsense |
| ISP-provided voice, TV or router features | Usually remain unchanged | May require additional configuration |
| Failure behavior | ISP-router clients may remain online | OPNsense is the single network edge |
| Migration risk | Lower and easy to roll back | Higher because OPNsense replaces the ISP routing session |

Double NAT is a practical intermediate or long-term design when bridge mode is unavailable or unreliable. Bridge mode is architecturally cleaner when the ISP fully supports it and all required connection details are available.

## Troubleshooting

### WAN does not receive an address

- Confirm the ISP-router cable reaches the physical NIC assigned to the WAN bridge.
- Confirm the OPNsense WAN adapter is attached to that bridge.
- Confirm WAN uses DHCP, not the previous PPPoE interface.
- Renew the WAN lease.

### WAN has a private address but traffic is blocked

- Uncheck **Block private networks** on WAN.
- Confirm the upstream and downstream subnets are different.
- Confirm automatic outbound NAT is active.
- Confirm the IPv4 LAN allow rule is enabled.

### Client receives an address from the wrong router

- Look for an accidental cable joining the ISP network to the downstream switch.
- Confirm DHCP is bound only to the intended interface on each router.
- Confirm the client is connected to the correct physical network.

### Client has an address but cannot browse

Test in this order:

1. OPNsense LAN address
2. ISP-router gateway from OPNsense
3. Public IPv4 address
4. DNS lookup
5. Domain-based website

### OPNsense fails to start after a host reboot

- Connect a laptop to the downstream switch.
- Assign a temporary static address from the downstream subnet if DHCP is unavailable.
- Open Proxmox at its static management address.
- Start the OPNsense VM manually and inspect its console.

### WireGuard handshakes but passes no traffic

A valid handshake proves the inbound UDP path but does not prove forwarding or source NAT on the VPN host.

- Confirm `net.ipv4.ip_forward=1`.
- Confirm the active physical interface actually owns the LAN address.
- Inspect both the VPN setup variables and the live firewall rules.
- Replace stale forwarding and masquerade rules that still reference a disconnected interface.
- Update the persistent firewall file as well as the live rules, then perform a controlled reboot test.

Changing a PiVPN setup-variable file alone does not rewrite already-loaded iptables rules.

### A direct port works locally but not externally

1. Confirm the service listens on the expected address and protocol.
2. Capture on the destination server during an external attempt.
3. If nothing arrives, capture OPNsense WAN.
4. If OPNsense WAN sees nothing, inspect the ISP-router rule.
5. If WAN sees the packet but the server does not, inspect OPNsense destination NAT and its registered firewall rule.
6. Verify that all pending OPNsense changes were applied.

## Security Notes

- Keep the WAN bridge unnumbered on the Proxmox host.
- Keep Proxmox and OPNsense administration on the trusted LAN.
- Do not add a broad WAN pass rule.
- Do not enable the ISP-router DMZ until inbound services are actually required.
- Remove abandoned port forwards from both routers instead of leaving dormant exposure.
- Keep raw game services internal when reliable external publishing is unnecessary.
- Reserve infrastructure addresses outside the dynamic DHCP pool.
- Store exported firewall configurations securely because they may contain secrets, keys and password hashes.
- Retain a console-based recovery path before every major interface change.

## Lessons Learned

The most important part of virtualizing a router was not the NAT setting itself. It was preserving clean separation across every layer: two physical NICs, two Proxmox bridges, two OPNsense interfaces and two non-overlapping IPv4 subnets.

Once that structure was correct, automatic source NAT, a normal LAN firewall rule and upstream DHCP were enough to provide reliable internet access. Backups, console access and a temporary staging subnet made it possible to preserve the established internal address plan without overlapping the WAN and LAN during migration.

Inbound publishing required the same discipline: a stable OPNsense WAN reservation, matching rules on both routers, protocol-aware testing and removal of experiments that were no longer needed. The VPN repair also demonstrated that configuration metadata, active firewall rules and persistent firewall rules must all agree on the real egress interface.

## References

- [OPNsense interfaces](https://docs.opnsense.org/manual/interfaces.html)
- [OPNsense NAT](https://docs.opnsense.org/manual/nat.html)
- [OPNsense Dnsmasq](https://docs.opnsense.org/manual/dnsmasq.html)
- [OPNsense DHCP](https://docs.opnsense.org/manual/dhcp.html)
- [OPNsense IPv6](https://docs.opnsense.org/manual/ipv6.html)
- [OPNsense virtual installations](https://docs.opnsense.org/manual/virtuals.html)
- [OPNsense backups](https://docs.opnsense.org/manual/backups.html)
- [Cloudflare Tunnel routing and supported protocols](https://developers.cloudflare.com/tunnel/routing/)
- [Cloudflare Spectrum limitations](https://developers.cloudflare.com/spectrum/reference/limitations/)
- [Mailcow advanced SSL and ACME requirements](https://docs.mailcow.email/firststeps-ssl/)
- [Mailcow DNS-01 challenge](https://docs.mailcow.email/post_installation/firststeps-ssl-dns/)
- [PiVPN WireGuard documentation](https://github.com/pivpn/pivpn/wiki/WireGuard)
