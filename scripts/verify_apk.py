from pathlib import Path
import hashlib
import subprocess
from apkutils2 import APK

path = Path("artifacts/lekka-current-c8a993f7.apk")
manifest = APK(str(path)).get_manifest()
application = manifest.get("application", {})
activities = application.get("activity", [])
if isinstance(activities, dict):
    activities = [activities]
intent_text = str(activities)
print(f"filename={path.name}")
print(f"size_bytes={path.stat().st_size}")
print(f"sha256={hashlib.sha256(path.read_bytes()).hexdigest()}")
print(f"package={manifest.get('@package')}")
print(f"version_name={manifest.get('@android:versionName')}")
print(f"version_code={manifest.get('@android:versionCode')}")
print(f"app_label={application.get('@android:label')}")
print(f"scheme_present={'manuslocalradarsa' in intent_text}")
print(f"arm64_present={subprocess.run(['unzip', '-l', str(path)], capture_output=True, text=True, check=True).stdout.find('lib/arm64-v8a/') >= 0}")
subprocess.run(['unzip', '-tq', str(path)], check=True)
print("zip_integrity=valid")
