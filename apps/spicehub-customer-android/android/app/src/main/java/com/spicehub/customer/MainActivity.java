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

        // Enable Geolocation in WebView
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().getSettings().setGeolocationEnabled(true);
            }
        } catch (Exception ignored) {}

        // Proactively request runtime CAMERA, LOCATION and NOTIFICATION permissions on Android 6.0+ (API 23+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            java.util.List<String> permissionsNeeded = new java.util.ArrayList<>();

            if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.CAMERA);
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.ACCESS_FINE_LOCATION);
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.ACCESS_COARSE_LOCATION);
            }
            if (Build.VERSION.SDK_INT >= 33) {
                if (ContextCompat.checkSelfPermission(this, "android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                    permissionsNeeded.add("android.permission.POST_NOTIFICATIONS");
                }
            }

            if (!permissionsNeeded.isEmpty()) {
                ActivityCompat.requestPermissions(
                    this,
                    permissionsNeeded.toArray(new String[0]),
                    CAMERA_PERMISSION_CODE
                );
            }
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                android.webkit.WebSettings settings = getBridge().getWebView().getSettings();
                settings.setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                settings.setGeolocationEnabled(true);
                settings.setDomStorageEnabled(true);
            }
        } catch (Exception ignored) {}
    }
}
