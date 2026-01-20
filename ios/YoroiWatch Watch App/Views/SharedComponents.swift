// ============================================
// YOROI WATCH - Composants Partagés
// Shapes, Graphiques et UI réutilisables
// ============================================

import SwiftUI

// MARK: - Shapes

struct WaterBottleShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        let neckWidth = w * 0.35
        let neckHeight = h * 0.12
        let shoulderRadius = w * 0.15
        let cornerRadius = w * 0.1
        path.move(to: CGPoint(x: (w - neckWidth) / 2, y: 0))
        path.addLine(to: CGPoint(x: (w + neckWidth) / 2, y: 0))
        path.addLine(to: CGPoint(x: (w + neckWidth) / 2, y: neckHeight))
        path.addArc(tangent1End: CGPoint(x: w, y: neckHeight), tangent2End: CGPoint(x: w, y: h), radius: shoulderRadius)
        path.addArc(tangent1End: CGPoint(x: w, y: h), tangent2End: CGPoint(x: 0, y: h), radius: cornerRadius)
        path.addArc(tangent1End: CGPoint(x: 0, y: h), tangent2End: CGPoint(x: 0, y: neckHeight), radius: cornerRadius)
        path.addArc(tangent1End: CGPoint(x: 0, y: neckHeight), tangent2End: CGPoint(x: (w - neckWidth) / 2, y: neckHeight), radius: shoulderRadius)
        path.addLine(to: CGPoint(x: (w - neckWidth) / 2, y: neckHeight))
        path.closeSubpath()
        return path
    }
}

struct WaveShape: Shape {
    var offset: CGFloat
    var percent: Double
    var animatableData: CGFloat {
        get { offset }
        set { offset = newValue }
    }
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let waveHeight: CGFloat = 4
        let width = rect.width
        let height = rect.height
        path.move(to: CGPoint(x: 0, y: waveHeight))
        for x in stride(from: 0, through: width, by: 1) {
            let relativeX = x / width
            let sine = sin(relativeX * .pi * 2 + offset)
            let y = waveHeight + sine * waveHeight
            path.addLine(to: CGPoint(x: x, y: y))
        }
        path.addLine(to: CGPoint(x: width, y: height))
        path.addLine(to: CGPoint(x: 0, y: height))
        path.closeSubpath()
        return path
    }
}

// MARK: - Graphiques

struct SparklineView: View {
    let data: [Double]
    let color: Color
    var body: some View {
        GeometryReader { geo in
            if data.count > 1 {
                Path { path in
                    let width = geo.size.width
                    let height = geo.size.height
                    let maxVal = data.max() ?? 1
                    let minVal = data.min() ?? 0
                    let range = maxVal - minVal
                    for (i, val) in data.enumerated() {
                        let x = CGFloat(i) / CGFloat(data.count - 1) * width
                        let y = height - CGFloat((val - minVal) / (range > 0 ? range : 1)) * height
                        if i == 0 { path.move(to: CGPoint(x: x, y: y)) }
                        else { path.addLine(to: CGPoint(x: x, y: y)) }
                    }
                }
                .stroke(color, style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
            }
        }
    }
}

// MARK: - UI Components

struct MetricSquare: View {
    let icon: String
    let color: Color
    let value: String
    let label: String
    var body: some View {
        VStack(spacing: 2) {
            Image(systemName: icon).font(.system(size: 12)).foregroundColor(color)
            Text(value).font(.system(size: 14, weight: .black, design: .rounded)).foregroundColor(.white)
            Text(label).font(.system(size: 7, weight: .bold)).foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 8).background(Color.gray.opacity(0.12)).cornerRadius(10)
    }
}
