package com.zriemann.visualizer;

import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {

    private View fullscreenView;
    private android.webkit.WebChromeClient.CustomViewCallback fullscreenCallback;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Capacitor's default client exits HTML fullscreen immediately; the web app
        // uses element.requestFullscreen() for the 3D view and the video player.
        bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(bridge) {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreenView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                fullscreenView = view;
                fullscreenCallback = callback;
                ViewGroup decor = (ViewGroup) getWindow().getDecorView();
                decor.addView(view, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                setSystemBarsHidden(true);
            }

            @Override
            public void onHideCustomView() {
                exitFullscreen();
            }
        });

        // Back button leaves fullscreen first, then behaves normally.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (fullscreenView != null) {
                    if (fullscreenCallback != null) fullscreenCallback.onCustomViewHidden();
                    exitFullscreen();
                } else if (bridge.getWebView().canGoBack()) {
                    bridge.getWebView().goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                }
            }
        });
    }

    private void exitFullscreen() {
        if (fullscreenView == null) return;
        ((ViewGroup) getWindow().getDecorView()).removeView(fullscreenView);
        fullscreenView = null;
        fullscreenCallback = null;
        setSystemBarsHidden(false);
    }

    private void setSystemBarsHidden(boolean hidden) {
        WindowInsetsControllerCompat c =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (hidden) {
            c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            c.hide(WindowInsetsCompat.Type.systemBars());
        } else {
            c.show(WindowInsetsCompat.Type.systemBars());
        }
    }
}
