# Native Mobile App - Call Screen Integration
## Reference code for future iOS/Android development

---

## iOS Implementation (Swift)

### 1. Info.plist Permissions
```xml
<key>NSContactsUsageDescription</key>
<string>Display important reminders during phone calls</string>
```

### 2. CallKit Integration (CallObserver.swift)
```swift
import CallKit
import UIKit

class CallObserver: NSObject, CXCallObserverDelegate {
    private let callObserver = CXCallObserver()
    
    override init() {
        super.init()
        callObserver.setDelegate(self, queue: nil)
    }
    
    func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
        if call.hasConnected && !call.hasEnded {
            // Call is active
            handleIncomingCall(phoneNumber: call.remoteHandle?.value ?? "")
        } else if call.hasEnded {
            // Call ended
            dismissReminderOverlay()
        }
    }
    
    private func handleIncomingCall(phoneNumber: String) {
        // Fetch reminders from API
        fetchReminders(for: phoneNumber) { reminders in
            if !reminders.isEmpty {
                DispatchQueue.main.async {
                    self.showReminderOverlay(reminders: reminders)
                }
            }
        }
    }
    
    private func fetchReminders(for phoneNumber: String, completion: @escaping ([Reminder]) -> Void) {
        // API call to your backend
        let url = URL(string: "https://your-api.com/reminders?phone=\(phoneNumber)")!
        
        URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data else { return }
            let reminders = try? JSONDecoder().decode([Reminder].self, from: data)
            completion(reminders ?? [])
        }.resume()
    }
    
    private func showReminderOverlay(reminders: [Reminder]) {
        let window = UIApplication.shared.windows.first
        let overlayVC = ReminderOverlayViewController(reminders: reminders)
        window?.rootViewController?.present(overlayVC, animated: true)
    }
    
    private func dismissReminderOverlay() {
        // Dismiss overlay
    }
}

struct Reminder: Codable {
    let title: String
    let content: String
    let priority: String
    let isSensitive: Bool
}
```

### 3. Overlay UI (ReminderOverlayViewController.swift)
```swift
import UIKit

class ReminderOverlayViewController: UIViewController {
    private let reminders: [Reminder]
    
    init(reminders: [Reminder]) {
        self.reminders = reminders
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Semi-transparent background
        view.backgroundColor = UIColor.black.withAlphaComponent(0.7)
        
        // Create reminder cards
        let stackView = UIStackView()
        stackView.axis = .vertical
        stackView.spacing = 12
        stackView.translatesAutoresizingMaskIntoConstraints = false
        
        for reminder in reminders {
            let card = createReminderCard(reminder: reminder)
            stackView.addArrangedSubview(card)
        }
        
        view.addSubview(stackView)
        
        NSLayoutConstraint.activate([
            stackView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stackView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            stackView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20)
        ])
        
        // Dismiss on tap
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissOverlay))
        view.addGestureRecognizer(tapGesture)
    }
    
    private func createReminderCard(reminder: Reminder) -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 16
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.2
        card.layer.shadowOffset = CGSize(width: 0, height: 4)
        card.layer.shadowRadius = 8
        
        let titleLabel = UILabel()
        titleLabel.text = reminder.title
        titleLabel.font = UIFont.boldSystemFont(ofSize: 16)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        
        let contentLabel = UILabel()
        contentLabel.text = reminder.content
        contentLabel.font = UIFont.systemFont(ofSize: 14)
        contentLabel.numberOfLines = 0
        contentLabel.translatesAutoresizingMaskIntoConstraints = false
        
        if reminder.isSensitive {
            contentLabel.textColor = .lightGray
            // Add blur effect
        }
        
        card.addSubview(titleLabel)
        card.addSubview(contentLabel)
        
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: card.topAnchor, constant: 16),
            titleLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
            titleLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
            
            contentLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            contentLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
            contentLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
            contentLabel.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -16)
        ])
        
        return card
    }
    
    @objc private func dismissOverlay() {
        dismiss(animated: true)
    }
}
```

---

## Android Implementation (Kotlin)

### 1. AndroidManifest.xml Permissions
```xml
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.READ_CALL_LOG" />
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.READ_CONTACTS" />
```

### 2. Call Detection Service (CallDetectionService.kt)
```kotlin
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.os.Build
import kotlinx.coroutines.*

class CallDetectionService : Service() {
    private lateinit var telephonyManager: TelephonyManager
    private val serviceScope = CoroutineScope(Dispatchers.Main + Job())
    
    override fun onCreate() {
        super.onCreate()
        telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            telephonyManager.registerTelephonyCallback(
                mainExecutor,
                object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                    override fun onCallStateChanged(state: Int) {
                        handleCallState(state)
                    }
                }
            )
        } else {
            @Suppress("DEPRECATION")
            telephonyManager.listen(object : PhoneStateListener() {
                @Deprecated("Deprecated in API 31")
                override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                    handleCallState(state, phoneNumber)
                }
            }, PhoneStateListener.LISTEN_CALL_STATE)
        }
    }
    
    private fun handleCallState(state: Int, phoneNumber: String? = null) {
        when (state) {
            TelephonyManager.CALL_STATE_RINGING -> {
                // Incoming call
                phoneNumber?.let { fetchAndShowReminders(it) }
            }
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                // Call active
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                // Call ended
                dismissReminderOverlay()
            }
        }
    }
    
    private fun fetchAndShowReminders(phoneNumber: String) {
        serviceScope.launch {
            try {
                val reminders = withContext(Dispatchers.IO) {
                    // Fetch from API
                    fetchRemindersFromAPI(phoneNumber)
                }
                
                if (reminders.isNotEmpty()) {
                    showReminderOverlay(reminders)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
    
    private suspend fun fetchRemindersFromAPI(phoneNumber: String): List<Reminder> {
        // HTTP request to your backend
        // Example using Retrofit/OkHttp
        return emptyList()
    }
    
    private fun showReminderOverlay(reminders: List<Reminder>) {
        val intent = Intent(this, ReminderOverlayActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        intent.putParcelableArrayListExtra("reminders", ArrayList(reminders))
        startActivity(intent)
    }
    
    private fun dismissReminderOverlay() {
        // Send broadcast to close overlay
        sendBroadcast(Intent("CLOSE_REMINDER_OVERLAY"))
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
    }
}

data class Reminder(
    val title: String,
    val content: String,
    val priority: String,
    val isSensitive: Boolean
) : android.os.Parcelable {
    constructor(parcel: android.os.Parcel) : this(
        parcel.readString() ?: "",
        parcel.readString() ?: "",
        parcel.readString() ?: "",
        parcel.readByte() != 0.toByte()
    )
    
    override fun writeToParcel(parcel: android.os.Parcel, flags: Int) {
        parcel.writeString(title)
        parcel.writeString(content)
        parcel.writeString(priority)
        parcel.writeByte(if (isSensitive) 1 else 0)
    }
    
    override fun describeContents(): Int = 0
    
    companion object CREATOR : android.os.Parcelable.Creator<Reminder> {
        override fun createFromParcel(parcel: android.os.Parcel): Reminder = Reminder(parcel)
        override fun newArray(size: Int): Array<Reminder?> = arrayOfNulls(size)
    }
}
```

### 3. Overlay Activity (ReminderOverlayActivity.kt)
```kotlin
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.PixelFormat
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import androidx.cardview.widget.CardView

class ReminderOverlayActivity : Activity() {
    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null
    
    private val closeReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            finish()
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Register broadcast receiver
        registerReceiver(closeReceiver, IntentFilter("CLOSE_REMINDER_OVERLAY"))
        
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        
        val reminders = intent.getParcelableArrayListExtra<Reminder>("reminders") ?: return
        
        // Create overlay
        overlayView = createOverlayView(reminders)
        
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )
        
        params.gravity = Gravity.CENTER
        
        windowManager.addView(overlayView, params)
        
        // Dismiss on click
        overlayView?.setOnClickListener {
            finish()
        }
    }
    
    private fun createOverlayView(reminders: List<Reminder>): View {
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 40, 40, 40)
            setBackgroundColor(0xB0000000.toInt()) // Semi-transparent black
        }
        
        for (reminder in reminders) {
            val card = CardView(this).apply {
                radius = 24f
                setCardBackgroundColor(0xFFFFFFFF.toInt())
                cardElevation = 8f
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 24)
                }
            }
            
            val cardContent = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(32, 32, 32, 32)
            }
            
            val titleView = TextView(this).apply {
                text = reminder.title
                textSize = 18f
                setTypeface(null, android.graphics.Typeface.BOLD)
                setTextColor(0xFF000000.toInt())
            }
            
            val contentView = TextView(this).apply {
                text = reminder.content
                textSize = 14f
                setTextColor(0xFF666666.toInt())
                setPadding(0, 16, 0, 0)
            }
            
            if (reminder.isSensitive) {
                // Apply blur effect or hide initially
                contentView.setTextColor(0xFFCCCCCC.toInt())
            }
            
            cardContent.addView(titleView)
            cardContent.addView(contentView)
            card.addView(cardContent)
            container.addView(card)
        }
        
        return container
    }
    
    override fun onDestroy() {
        super.onDestroy()
        overlayView?.let { windowManager.removeView(it) }
        unregisterReceiver(closeReceiver)
    }
}
```

---

## API Integration

Both platforms should call your existing API:

```
GET /api/reminders?phone_number={number}
```

Response format:
```json
{
  "reminders": [
    {
      "title": "Project X Serial Number",
      "content": "SN-12345-ABCDE",
      "priority": "critical",
      "is_sensitive": true,
      "contact_names": ["John Smith"],
      "phone_numbers": ["+1234567890"]
    }
  ]
}
```

---

## Notes

1. **iOS**: Uses CallKit framework - no actual overlay during calls, shows in notification/full screen
2. **Android**: Can show true overlay using SYSTEM_ALERT_WINDOW permission
3. **Privacy**: Both require explicit user permission for phone state access
4. **Background Service**: Must run as foreground service on Android 8+
5. **Battery**: Optimize API calls to prevent battery drain

## Future Enhancements
- Voice command to reveal blurred sensitive info
- Auto-copy to clipboard on tap
- Integration with contacts app
- Offline caching of recent reminders