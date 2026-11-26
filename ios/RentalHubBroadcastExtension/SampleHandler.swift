import Foundation
import CoreImage
import ReplayKit

class SampleHandler: RPBroadcastSampleHandler {
    private static let appGroupIdentifier = "group.com.rentalhubng.screencapture"
    private static let socketFileName = "rtc_SSFD"

    private let ciContext = CIContext(options: nil)
    private let queue = DispatchQueue(label: "com.rentalhubng.broadcast.frame", qos: .userInitiated)
    private var socketFD: Int32 = -1
    private var lastFrameTime: CFTimeInterval = 0

    override func broadcastStarted(withSetupInfo setupInfo: [String : NSObject]?) {
        queue.sync { connect() }
    }

    override func broadcastPaused() {
        queue.sync { closeSocket() }
    }

    override func broadcastResumed() {
        queue.sync { connect() }
    }

    override func broadcastFinished() {
        queue.sync { closeSocket() }
    }

    override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
        guard sampleBufferType == .video else { return }
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let now = CFAbsoluteTimeGetCurrent()
        if now - lastFrameTime < 1.0 / 15.0 { return }
        lastFrameTime = now

        queue.async {
            guard self.socketFD >= 0 else { return }
            guard let data = self.frameData(from: pixelBuffer) else { return }
            if !self.writeFrame(data, pixelBuffer: pixelBuffer) {
                self.closeSocket()
                let error = NSError(domain: "RentalHubScreenShare", code: 2,
                                    userInfo: [NSLocalizedDescriptionKey: "The call stopped receiving screen frames."])
                self.finishBroadcast(with: error)
            }
        }
    }

    private func connect() {
        guard socketFD < 0 else { return }
        guard let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: Self.appGroupIdentifier
        ) else {
            finishBroadcast(with: NSError(domain: "RentalHubScreenShare", code: 1,
                                          userInfo: [NSLocalizedDescriptionKey: "App group is not configured."]))
            return
        }

        let socketPath = container.appendingPathComponent(Self.socketFileName).path
        var address = sockaddr_un()
        address.sun_family = sa_family_t(AF_UNIX)
        let pathLimit = MemoryLayout.size(ofValue: address.sun_path) - 1
        socketPath.withCString { source in
            _ = strncpy(&address.sun_path.0, source, pathLimit)
        }

        let fd = socket(AF_UNIX, Int32(SOCK_STREAM.rawValue), 0)
        guard fd >= 0 else { return }

        let connected = withUnsafePointer(to: &address) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
                connect(fd, sockaddrPointer, socklen_t(MemoryLayout<sockaddr_un>.size)) == 0
            }
        }

        if connected {
            socketFD = fd
        } else {
            close(fd)
        }
    }

    private func closeSocket() {
        guard socketFD >= 0 else { return }
        close(socketFD)
        socketFD = -1
    }

    private func frameData(from pixelBuffer: CVPixelBuffer) -> Data? {
        let image = CIImage(cvPixelBuffer: pixelBuffer)
        return ciContext.pngRepresentation(
            of: image,
            format: .RGBA8,
            colorSpace: CGColorSpaceCreateDeviceRGB()
        )
    }

    private func writeFrame(_ data: Data, pixelBuffer: CVPixelBuffer) -> Bool {
        guard let url = URL(string: "http://rentalhub.local/frame") else { return false }
        guard let message = CFHTTPMessageCreateRequest(
            kCFAllocatorDefault,
            "POST" as CFString,
            url as CFURL,
            kCFHTTPVersion1_1
        ) else { return false }

        CFHTTPMessageSetHeaderFieldValue(message, "Content-Length" as CFString, String(data.count) as CFString)
        CFHTTPMessageSetHeaderFieldValue(
            message,
            "Buffer-Width" as CFString,
            String(CVPixelBufferGetWidth(pixelBuffer)) as CFString
        )
        CFHTTPMessageSetHeaderFieldValue(
            message,
            "Buffer-Height" as CFString,
            String(CVPixelBufferGetHeight(pixelBuffer)) as CFString
        )
        CFHTTPMessageSetHeaderFieldValue(message, "Buffer-Orientation" as CFString, "1" as CFString)

        let appended = data.withUnsafeBytes { raw -> Bool in
            guard let base = raw.baseAddress else { return false }
            return CFHTTPMessageAppendBytes(message, base.assumingMemoryBound(to: UInt8.self), data.count)
        }
        guard appended else { return false }

        guard let serialized = CFHTTPMessageCopySerializedMessage(message) else { return false }
        let frame = serialized as Data
        var offset = 0
        while offset < frame.count {
            let written = frame.withUnsafeBytes { raw -> Int in
                guard let base = raw.baseAddress else { return -1 }
                return write(socketFD, base.advanced(by: offset), frame.count - offset)
            }
            if written < 0 {
                if errno == EINTR { continue }
                return false
            }
            if written == 0 { return false }
            offset += written
        }
        return true
    }
}
