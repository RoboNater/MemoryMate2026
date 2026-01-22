> the web server is running on a wsl2 VM under Windows 11.  The port seems to be only available
 from the Windows 11 system or the wsl2 VM, but not from the network that the Windows 11 
computer is attached to.  I assume I need to somehow open a port on 0.0.0.0:5173 on windows 
that forwards to the VM 5173 port; or perhaps open a new port e.g. 0.0.0.0:5174 on Windows that
 forwards to Windows 127.0.0.1:5173. And then I need to open up that port in Windows firewall. 
 Or maybe the port stuff already is setup correctly, and I just need to open the firewall?  
what do you recommend? 

● You're right - WSL2 uses a NAT'd network. You need both port forwarding AND a firewall rule. Here's the recommended approach:

  Run these commands in an elevated PowerShell (Admin) on Windows:

  1. Add port forwarding (Windows → WSL2)

    netsh interface portproxy add v4tov4 listenport=5174 listenaddress=0.0.0.0 connectport=5173 connectaddress=127.0.0.1

  or

  If VS Code automatically setup a forwarding port, first query with:

    netsh interface portproxy show all
  
  Then add a port like this example for port 8091:
  
    netsh interface portproxy add v4tov4 listenport=5174 connectaddress=127.0.0.1 connectport=8091 listenaddress=0.0.0.0
  
  This works because Windows automatically forwards localhost traffic to WSL2.

  2. Add firewall rule

  New-NetFirewallRule -DisplayName "WSL2 Vite Dev Server" -Direction Inbound -LocalPort 5174 -Protocol TCP -Action Allow

  3. Find your Windows IP

  ipconfig

  Look for your WiFi or Ethernet adapter's IPv4 address (e.g., 192.168.1.x).

  Then on your phone, go to: http://[YOUR_WINDOWS_IP]:5173/

  ---
  To remove later (cleanup)

  netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0

  OR

  netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=5174
  
  AND 
  
  Remove-NetFirewallRule -DisplayName "WSL2 Vite Dev Server"