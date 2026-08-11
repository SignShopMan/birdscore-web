import Capacitor
import UIKit

/// overscroll-behavior: none (globals.css) doesn't reliably suppress the
/// root scroller's elastic bounce in WKWebView — a known WebKit gap, CSS
/// alone can't fully fix this. Disabling it on the underlying
/// UIScrollView directly is the actual, reliable mechanism.
class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.scrollView.bounces = false
    }
}
