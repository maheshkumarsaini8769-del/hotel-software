#!/usr/bin/env python3
"""
Phone Screen Keep-Alive Service
- Gently wiggles the mobile screen every 9 minutes (540s) so it doesn't sleep/lock.
- Monitors hardware input events (getevent): if any physical touch or button press
  occurs, it stops immediately.
"""

import argparse
import datetime
import os
import select
import signal
import subprocess
import sys
import time

LOG_FILE_DEFAULT = "/tmp/phone_keepalive.log"
PID_FILE = "/tmp/phone_keepalive.pid"


def log(msg: str, log_file: str = LOG_FILE_DEFAULT):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{ts}] {msg}"
    print(formatted, flush=True)
    try:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except Exception:
        pass


def get_default_device() -> str:
    try:
        output = subprocess.check_output(["adb", "devices"], text=True)
        lines = output.strip().splitlines()[1:]
        devices = [l.split()[0] for l in lines if "\tdevice" in l]
        if not devices:
            raise RuntimeError("No ADB devices connected.")
        return devices[0]
    except Exception as e:
        raise RuntimeError(f"Failed to find ADB device: {e}")


def is_screen_awake(device: str) -> bool:
    try:
        out = subprocess.check_output(
            ["adb", "-s", device, "shell", "dumpsys", "power"],
            text=True,
            stderr=subprocess.DEVNULL,
            timeout=5,
        )
        for line in out.splitlines():
            if "mWakefulness=" in line:
                return "mWakefulness=Awake" in line
        return True
    except Exception:
        return False


def wiggle_screen(device: str, width: int = 1080, height: int = 2392):
    """
    Subtle drag/nudge that registers as user activity on Android
    without clicking or opening any icons.
    """
    cx = width // 2
    cy = height // 2
    delta = 45

    cmd1 = ["adb", "-s", device, "shell", "input", "swipe", str(cx), str(cy), str(cx), str(cy + delta), "120"]
    cmd2 = ["adb", "-s", device, "shell", "input", "swipe", str(cx), str(cy + delta), str(cx), str(cy), "120"]

    subprocess.run(cmd1, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.08)
    subprocess.run(cmd2, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    parser = argparse.ArgumentParser(description="Keep mobile screen alive every N minutes")
    parser.add_argument("--interval", type=int, default=540, help="Interval in seconds (default: 540 = 9 minutes)")
    parser.add_argument("--device", type=str, default="", help="ADB device ID")
    parser.add_argument("--log-file", type=str, default=LOG_FILE_DEFAULT, help="Log file path")
    parser.add_argument("--no-initial-wiggle", action="store_true", help="Skip initial wiggle on start")
    args = parser.parse_args()

    log_path = args.log_file
    # Clear / truncate or init log
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Phone Keep-Alive service initializing...\n")

    # Save PID
    with open(PID_FILE, "w", encoding="utf-8") as f:
        f.write(str(os.getpid()))

    device = args.device or get_default_device()
    log(f"Target ADB device: {device}", log_path)

    # Get screen dimensions
    width, height = 1080, 2392
    try:
        wm_size = subprocess.check_output(
            ["adb", "-s", device, "shell", "wm", "size"],
            text=True,
            stderr=subprocess.DEVNULL,
            timeout=5,
        )
        if "Physical size:" in wm_size:
            size_part = wm_size.split("Physical size:")[-1].strip()
            w_str, h_str = size_part.split("x")
            width, height = int(w_str), int(h_str)
            log(f"Screen size detected: {width}x{height}", log_path)
    except Exception as e:
        log(f"Warning: could not detect size, using default {width}x{height}: {e}", log_path)

    # Check screen awake
    if not is_screen_awake(device):
        log("Screen is currently off/asleep. Turning screen ON...", log_path)
        subprocess.run(["adb", "-s", device, "shell", "input", "keyevent", "KEYCODE_WAKEUP"])
        time.sleep(1)

    # Start physical event listener after initial wiggle
    # Initial wiggle
    if not args.no_initial_wiggle:
        wiggle_screen(device, width, height)
        time.sleep(0.5)
        log("Initial screen wiggle performed. Screen timeout timer reset.", log_path)

    getevent_cmd = ["adb", "-s", device, "shell", "getevent", "-q"]
    getevent_proc = subprocess.Popen(
        getevent_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    def cleanup(signum=None, frame=None):
        log("Keep-alive service shutting down...", log_path)
        try:
            getevent_proc.terminate()
            getevent_proc.wait(timeout=2)
        except Exception:
            try:
                getevent_proc.kill()
            except Exception:
                pass
        try:
            if os.path.exists(PID_FILE):
                os.remove(PID_FILE)
        except Exception:
            pass
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    last_wiggle = time.time()
    log(
        f"Keep-alive active. Har {args.interval // 60} minute ({args.interval}s) baad screen ko hela diya jayega. "
        f"Phone me physical touch/button press hote hi script turant bnd ho jayegi.",
        log_path,
    )

    last_health_check = time.time()
    is_wiggling = False

    while True:
        try:
            # Poll getevent stdout with 1-second timeout
            rlist, _, _ = select.select([getevent_proc.stdout], [], [], 1.0)
            if rlist and not is_wiggling:
                line = getevent_proc.stdout.readline()
                if not line:
                    log("Device connection closed or getevent stopped. Exiting.", log_path)
                    break
                log("⚡ USER WORK DETECTED ON PHONE! (Touch screen ya button press hua).", log_path)
                log("Hukumat/Instruction ke anusar script turant bnd ki ja rahi hai. (Stopping service).", log_path)
                break

            now = time.time()
            if now - last_wiggle >= args.interval:
                log(f"⏰ {args.interval // 60} minute ho gaye hain. Screen ko halka sa hela rahe hain...", log_path)
                is_wiggling = True
                wiggle_screen(device, width, height)
                time.sleep(0.6)
                # Flush any generated events from our own wiggle
                while True:
                    flushed, _, _ = select.select([getevent_proc.stdout], [], [], 0.1)
                    if flushed:
                        getevent_proc.stdout.readline()
                    else:
                        break
                is_wiggling = False
                last_wiggle = time.time()
                log("Screen timeout reset successfully.", log_path)

            # Health check every 20 seconds
            if now - last_health_check >= 20:
                last_health_check = now
                if not is_screen_awake(device):
                    log("Screen turned off (power button pressed). Stopping service.", log_path)
                    break

            # Time to wiggle screen
            elapsed = now - last_wiggle
            if elapsed >= args.interval:
                log(f"⏰ {args.interval // 60} minutes ho gaye. Screen ko hela rahe hain taaki screen off na ho...", log_path)
                wiggle_screen(device, width, height)
                last_wiggle = time.time()
                log(f"Screen wiggled successfully! Agli baar {args.interval // 60} min baad check hoga.", log_path)

        except KeyboardInterrupt:
            break
        except Exception as e:
            log(f"Unexpected error in main loop: {e}", log_path)
            break

    cleanup()


if __name__ == "__main__":
    main()
