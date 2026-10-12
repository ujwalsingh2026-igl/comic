import java.awt.*;
import java.awt.geom.*;
import java.awt.image.BufferedImage;
import java.io.File;
import javax.imageio.ImageIO;

public class GenerateAndroidIcons {

    public static void main(String[] args) throws Exception {
        System.out.println("=== Generating Omniverse Android App Icons ===");

        String resDir = "android/app/src/main/res";
        String mainDir = "android/app/src/main";
        String publicDir = "public";

        // Densities and sizes:
        // Density Name | Legacy (px) | Adaptive Foreground (px)
        int[][] densities = {
            { 48,  108 }, // mdpi
            { 72,  162 }, // hdpi
            { 96,  216 }, // xhdpi
            { 144, 324 }, // xxhdpi
            { 192, 432 }  // xxxhdpi
        };
        String[] densityNames = {
            "mipmap-mdpi",
            "mipmap-hdpi",
            "mipmap-xhdpi",
            "mipmap-xxhdpi",
            "mipmap-xxxhdpi"
        };

        for (int i = 0; i < densities.length; i++) {
            String dirPath = resDir + "/" + densityNames[i];
            File dir = new File(dirPath);
            if (!dir.exists()) dir.mkdirs();

            int legacySize = densities[i][0];
            int adaptiveSize = densities[i][1];

            // 1. Legacy Square Icon (ic_launcher.png)
            BufferedImage legacySquare = renderFullIcon(legacySize, IconShape.ROUNDED_RECT);
            ImageIO.write(legacySquare, "PNG", new File(dir, "ic_launcher.png"));

            // 2. Legacy Round Icon (ic_launcher_round.png)
            BufferedImage legacyRound = renderFullIcon(legacySize, IconShape.CIRCLE);
            ImageIO.write(legacyRound, "PNG", new File(dir, "ic_launcher_round.png"));

            // 3. Adaptive Foreground (ic_launcher_foreground.png)
            BufferedImage foreground = renderAdaptiveForeground(adaptiveSize);
            ImageIO.write(foreground, "PNG", new File(dir, "ic_launcher_foreground.png"));

            System.out.println("Generated " + densityNames[i] + ": legacy=" + legacySize + "px, foreground=" + adaptiveSize + "px");
        }

        // 4. Google Play Store 512x512 PNG
        BufferedImage playStoreIcon = renderFullIcon(512, IconShape.SQUARE);
        File playStoreFile1 = new File(mainDir, "play_store_512.png");
        File playStoreFile2 = new File(publicDir, "play_store_512.png");
        ImageIO.write(playStoreIcon, "PNG", playStoreFile1);
        ImageIO.write(playStoreIcon, "PNG", playStoreFile2);
        System.out.println("Generated Google Play Store Icon (512x512) at: " + playStoreFile1.getPath() + " and " + playStoreFile2.getPath());

        System.out.println("=== Icon Generation Complete ===");
    }

    enum IconShape {
        SQUARE,
        ROUNDED_RECT,
        CIRCLE
    }

    /**
     * Renders a full launcher icon (background + glyph)
     */
    private static BufferedImage renderFullIcon(int size, IconShape shape) {
        BufferedImage image = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = (Graphics2D) image.getGraphics();

        // High quality rendering hints
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_COLOR_RENDERING, RenderingHints.VALUE_COLOR_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE);

        // Clip if needed
        Shape clipShape = null;
        if (shape == IconShape.CIRCLE) {
            clipShape = new Ellipse2D.Double(0.5, 0.5, size - 1, size - 1);
            g.setClip(clipShape);
        } else if (shape == IconShape.ROUNDED_RECT) {
            double radius = size * 0.22;
            clipShape = new RoundRectangle2D.Double(0.5, 0.5, size - 1, size - 1, radius, radius);
            g.setClip(clipShape);
        }

        // 1. Background gradient (Deep Midnight Obsidian into Rich Royal Indigo)
        GradientPaint bgGradient = new GradientPaint(
            0, 0, new Color(11, 15, 25),
            size, size, new Color(30, 27, 75)
        );
        g.setPaint(bgGradient);
        g.fillRect(0, 0, size, size);

        // 2. Subtle central radial glow
        float glowCenterX = size * 0.5f;
        float glowCenterY = size * 0.5f;
        float glowRadius = size * 0.45f;
        RadialGradientPaint glow = new RadialGradientPaint(
            glowCenterX, glowCenterY, glowRadius,
            new float[]{ 0.0f, 0.6f, 1.0f },
            new Color[]{
                new Color(99, 102, 241, 75), // Indigo glow
                new Color(124, 58, 237, 25), // Violet haze
                new Color(11, 15, 25, 0)
            }
        );
        g.setPaint(glow);
        g.fillRect(0, 0, size, size);

        // 3. Render the Book & Storytelling Glyph
        // In full icons, safe glyph occupies ~60-64% of total canvas
        double glyphScale = (size * 0.62) / 100.0;
        double offsetX = (size - (100.0 * glyphScale)) / 2.0;
        double offsetY = (size - (100.0 * glyphScale)) / 2.0;

        renderGlyph(g, offsetX, offsetY, glyphScale);

        // Subtle border for rounded rect/circle
        if (shape == IconShape.CIRCLE || shape == IconShape.ROUNDED_RECT) {
            g.setClip(null);
            g.setColor(new Color(255, 255, 255, 25));
            g.setStroke(new BasicStroke(Math.max(1f, size * 0.015f)));
            if (shape == IconShape.CIRCLE) {
                g.draw(new Ellipse2D.Double(0.5, 0.5, size - 1, size - 1));
            } else {
                double radius = size * 0.22;
                g.draw(new RoundRectangle2D.Double(0.5, 0.5, size - 1, size - 1, radius, radius));
            }
        }

        g.dispose();
        return image;
    }

    /**
     * Renders adaptive icon foreground (transparent background, 108dp canvas with safe zone 72dp)
     */
    private static BufferedImage renderAdaptiveForeground(int size) {
        BufferedImage image = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = (Graphics2D) image.getGraphics();

        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE);

        // Safe zone is center 66.6% (72dp out of 108dp canvas)
        // We scale the 100x100 glyph coordinate space to fit comfortably within the 52% diameter of 108dp,
        // guaranteeing that any OEM mask (circle, squircle, round-rect) preserves the entire glyph.
        double glyphScale = (size * 0.52) / 100.0;
        double offsetX = (size - (100.0 * glyphScale)) / 2.0;
        double offsetY = (size - (100.0 * glyphScale)) / 2.0;

        renderGlyph(g, offsetX, offsetY, glyphScale);

        g.dispose();
        return image;
    }

    /**
     * Renders the stylized Omniverse Book / Comic / Audio glyph in a normalized 100x100 coordinate space.
     */
    private static void renderGlyph(Graphics2D g, double ox, double oy, double scale) {
        AffineTransform origTransform = g.getTransform();
        g.translate(ox, oy);
        g.scale(scale, scale);

        // Shadow behind the open book
        Path2D.Double shadowPath = new Path2D.Double();
        shadowPath.moveTo(14, 76);
        shadowPath.quadTo(50, 88, 86, 76);
        shadowPath.lineTo(88, 81);
        shadowPath.quadTo(50, 93, 12, 81);
        shadowPath.closePath();
        g.setColor(new Color(0, 0, 0, 80));
        g.fill(shadowPath);

        // 1. LEFT PAGE (Comics & Literature: Indigo to Electric Violet)
        Path2D.Double leftPage = new Path2D.Double();
        leftPage.moveTo(49, 28);
        leftPage.quadTo(32, 23, 14, 27);
        leftPage.lineTo(14, 72);
        leftPage.quadTo(32, 68, 49, 75);
        leftPage.closePath();

        GradientPaint leftGradient = new GradientPaint(
            14, 27, new Color(79, 70, 229),   // Indigo 600
            49, 75, new Color(124, 58, 237)   // Violet 600
        );
        g.setPaint(leftGradient);
        g.fill(leftPage);

        // Left page thickness / bottom edge
        Path2D.Double leftEdge = new Path2D.Double();
        leftEdge.moveTo(14, 72);
        leftEdge.lineTo(14, 75);
        leftEdge.quadTo(32, 71, 49, 78);
        leftEdge.lineTo(49, 75);
        leftEdge.quadTo(32, 68, 14, 72);
        leftEdge.closePath();
        g.setColor(new Color(67, 56, 202));
        g.fill(leftEdge);

        // Left page stylized comic panel lines
        g.setColor(new Color(255, 255, 255, 60));
        g.setStroke(new BasicStroke(2.2f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        Path2D.Double leftLine1 = new Path2D.Double();
        leftLine1.moveTo(22, 40);
        leftLine1.quadTo(34, 38, 43, 42);
        g.draw(leftLine1);

        Path2D.Double leftLine2 = new Path2D.Double();
        leftLine2.moveTo(22, 50);
        leftLine2.quadTo(34, 48, 43, 52);
        g.draw(leftLine2);

        Path2D.Double leftLine3 = new Path2D.Double();
        leftLine3.moveTo(22, 60);
        leftLine3.quadTo(34, 58, 43, 62);
        g.draw(leftLine3);

        // 2. RIGHT PAGE (Stories & Novels: Violet to Fuchsia Pink)
        Path2D.Double rightPage = new Path2D.Double();
        rightPage.moveTo(51, 28);
        rightPage.quadTo(68, 23, 86, 27);
        rightPage.lineTo(86, 72);
        rightPage.quadTo(68, 68, 51, 75);
        rightPage.closePath();

        GradientPaint rightGradient = new GradientPaint(
            51, 28, new Color(139, 92, 246),  // Violet 500
            86, 72, new Color(236, 72, 153)   // Pink 500
        );
        g.setPaint(rightGradient);
        g.fill(rightPage);

        // Right page thickness / bottom edge
        Path2D.Double rightEdge = new Path2D.Double();
        rightEdge.moveTo(86, 72);
        rightEdge.lineTo(86, 75);
        rightEdge.quadTo(68, 71, 51, 78);
        rightEdge.lineTo(51, 75);
        rightEdge.quadTo(68, 68, 86, 72);
        rightEdge.closePath();
        g.setColor(new Color(190, 24, 93));
        g.fill(rightEdge);

        // Right page stylized lines
        g.setColor(new Color(255, 255, 255, 75));
        Path2D.Double rightLine1 = new Path2D.Double();
        rightLine1.moveTo(57, 42);
        rightLine1.quadTo(66, 38, 78, 40);
        g.draw(rightLine1);

        Path2D.Double rightLine2 = new Path2D.Double();
        rightLine2.moveTo(57, 52);
        rightLine2.quadTo(66, 48, 78, 50);
        g.draw(rightLine2);

        Path2D.Double rightLine3 = new Path2D.Double();
        rightLine3.moveTo(57, 62);
        rightLine3.quadTo(66, 58, 78, 60);
        g.draw(rightLine3);

        // 3. CENTER BOOK SPINE
        Path2D.Double spine = new Path2D.Double();
        spine.moveTo(49, 28);
        spine.lineTo(51, 28);
        spine.lineTo(51, 76);
        spine.lineTo(49, 76);
        spine.closePath();
        g.setColor(new Color(30, 27, 75, 180));
        g.fill(spine);

        // 4. GOLDEN BOOKMARK RIBBON (Reading Progress & Immersion)
        Path2D.Double ribbon = new Path2D.Double();
        ribbon.moveTo(46, 24);
        ribbon.lineTo(54, 24);
        ribbon.lineTo(54, 52);
        ribbon.lineTo(50, 48); // chevron notch
        ribbon.lineTo(46, 52);
        ribbon.closePath();

        GradientPaint ribbonGradient = new GradientPaint(
            50, 24, new Color(251, 191, 36),  // Amber 400
            50, 52, new Color(245, 158, 11)   // Amber 500
        );
        g.setPaint(ribbonGradient);
        g.fill(ribbon);

        // Bookmark highlight
        g.setColor(new Color(254, 240, 138, 180));
        g.setStroke(new BasicStroke(1.2f));
        g.drawLine(47, 26, 47, 49);

        // 5. AUDIOBOOK / SPARKLE ACCENT (Celestial Star / Soundwave)
        // 4-point sparkle star at top right (x=80, y=20)
        double cx = 80;
        double cy = 20;
        double rOuter = 7.5;
        double rInner = 2.2;
        Path2D.Double star = new Path2D.Double();
        for (int i = 0; i < 8; i++) {
            double angle = i * Math.PI / 4.0;
            double r = (i % 2 == 0) ? rOuter : rInner;
            double x = cx + r * Math.cos(angle);
            double y = cy + r * Math.sin(angle);
            if (i == 0) star.moveTo(x, y);
            else star.lineTo(x, y);
        }
        star.closePath();
        g.setColor(new Color(253, 224, 71)); // Canary Yellow sparkle
        g.fill(star);

        // Secondary smaller sparkle (x=20, y=20)
        double cx2 = 20;
        double cy2 = 20;
        double rOuter2 = 4.5;
        double rInner2 = 1.4;
        Path2D.Double star2 = new Path2D.Double();
        for (int i = 0; i < 8; i++) {
            double angle = i * Math.PI / 4.0;
            double r = (i % 2 == 0) ? rOuter2 : rInner2;
            double x = cx2 + r * Math.cos(angle);
            double y = cy2 + r * Math.sin(angle);
            if (i == 0) star2.moveTo(x, y);
            else star2.lineTo(x, y);
        }
        star2.closePath();
        g.setColor(new Color(165, 180, 252)); // Light indigo sparkle
        g.fill(star2);

        g.setTransform(origTransform);
    }
}
