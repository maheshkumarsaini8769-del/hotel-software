package com.spicehub.staff;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int CAMERA_PERMISSION_CODE = 1002;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(true);

        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#FAF6EF"));
        window.setNavigationBarColor(Color.parseColor("#FAF6EF"));

        WindowCompat.setDecorFitsSystemWindows(window, false);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(true);
            controller.setAppearanceLightNavigationBars(true);
        }

        // Enable Geolocation in WebView
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().getSettings().setGeolocationEnabled(true);
            }
        } catch (Exception ignored) {}

        // Request runtime Camera, Location and Notification permissions if not yet granted
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
}
