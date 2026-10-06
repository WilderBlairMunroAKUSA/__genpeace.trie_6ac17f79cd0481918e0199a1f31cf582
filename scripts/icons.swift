import AppKit
import Foundation
let destination = CommandLine.arguments[1]
for size in [16, 32, 48, 128] {
    let image = NSImage(size: NSSize(width: size, height: size))
    image.lockFocus()
    NSColor(calibratedRed: 0.08, green: 0.20, blue: 0.13, alpha: 1).setFill()
    NSBezierPath(roundedRect: NSRect(x:0,y:0,width:size,height:size), xRadius:CGFloat(size)/5, yRadius:CGFloat(size)/5).fill()
    let attributes: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: CGFloat(size)*0.78), .foregroundColor: NSColor(calibratedRed:0.84,green:0.94,blue:0.62,alpha:1)]
    let text = NSAttributedString(string: "𐂷", attributes: attributes)
    let bounds = text.size()
    text.draw(at:NSPoint(x:(CGFloat(size)-bounds.width)/2,y:(CGFloat(size)-bounds.height)/2))
    image.unlockFocus()
    let bitmap = NSBitmapImageRep(data:image.tiffRepresentation!)!
    try bitmap.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:destination+"/\(size).png"))
}
