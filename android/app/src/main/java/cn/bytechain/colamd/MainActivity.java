package cn.bytechain.colamd;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

/**
 * 主活动类，继承自 Capacitor 的 BridgeActivity。
 * 针对 Android WebView 的中文输入法 (IME) 兼容性进行了特殊处理。
 */
public class MainActivity extends BridgeActivity {

    /**
     * 活动创建时的初始化方法。
     * 配置 WebView 以支持中文输入法的正常工作。
     *
     * @param savedInstanceState 保存的实例状态
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 获取 WebView 并配置以支持 IME
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();

            // 启用 JavaScript
            settings.setJavaScriptEnabled(true);

            // 启用 DOM 存储
            settings.setDomStorageEnabled(true);

            // 设置缓存模式
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);

            // 支持缩放
            settings.setSupportZoom(true);
            settings.setBuiltInZoomControls(true);
            settings.setDisplayZoomControls(false);

            // 自适应屏幕
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);

            // 重要：启用文本自动调整以支持 IME
            settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.TEXT_AUTOSIZING);

            // 设置 WebView 的焦点行为
            webView.setFocusable(true);
            webView.setFocusableInTouchMode(true);

            // 处理 WebView 的输入连接，增强 IME 支持
            setupIMEFocus(webView);
        }
    }

    /**
     * 设置 WebView 的 IME 焦点处理。
     * 解决 Android WebView 中文输入法无法正常输入的问题。
     *
     * @param webView 需要配置的 WebView 实例
     */
    private void setupIMEFocus(WebView webView) {
        // 监听焦点变化，确保输入法能正确连接
        webView.setOnFocusChangeListener(new View.OnFocusChangeListener() {
            @Override
            public void onFocusChange(View v, boolean hasFocus) {
                if (hasFocus) {
                    // 当 WebView 获得焦点时，请求软键盘
                    android.view.inputmethod.InputMethodManager imm =
                        (android.view.inputmethod.InputMethodManager)
                        getSystemService(INPUT_METHOD_SERVICE);
                    if (imm != null) {
                        imm.showSoftInput(v, 0);
                    }
                }
            }
        });
    }
}
