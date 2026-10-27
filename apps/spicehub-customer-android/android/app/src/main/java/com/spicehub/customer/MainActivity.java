package com.spicehub.customer;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    private static final int CAMERA_PERMISSION_CODE = 1001;

    @CapacitorPlugin(name = "AppSettings")
    public static class AppSettingsPlugin extends Plugin {
        @PluginMethod
        public void open(PluginCall call) {
            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
                intent.setData(uri);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to open app settings: " + e.getMessage());
            }
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppSettingsPlugin.class);
        super.onCreate(savedInstanceState);

        // WebView debugging
        WebView.setWebContentsDebuggingEnabled(true);

        // Make status bar dark, icons light
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#0f172a"));
        window.setNavigationBarColor(Color.parseColor("#0f172a"));

        // Handle notch/edge-to-edge
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // Proactively request runtime CAMERA permission on Android 6.0+ (API 23+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.CAMERA},
                    CAMERA_PERMISSION_CODE
                );
            }
        }
    }
}
