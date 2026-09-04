import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/tokens.dart';

class CountdownTimerWidget extends StatefulWidget {
  final DateTime targetEndTime;
  final String label;
  final VoidCallback? onFinished;

  const CountdownTimerWidget({
    super.key,
    required this.targetEndTime,
    this.label = 'ENDS IN',
    this.onFinished,
  });

  @override
  State<CountdownTimerWidget> createState() => _CountdownTimerWidgetState();
}

class _CountdownTimerWidgetState extends State<CountdownTimerWidget> {
  Timer? _timer;
  Duration _remaining = Duration.zero;

  @override
  void initState() {
    super.initState();
    _updateRemaining();
    _startTimer();
  }

  @override
  void didUpdateWidget(covariant CountdownTimerWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.targetEndTime != widget.targetEndTime) {
      _updateRemaining();
      _startTimer();
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      _updateRemaining();
    });
  }

  void _updateRemaining() {
    final diff = widget.targetEndTime.toUtc().difference(DateTime.now().toUtc());
    if (diff.isNegative) {
      _timer?.cancel();
      _remaining = Duration.zero;
      if (mounted) {
        setState(() {});
        widget.onFinished?.call();
      }
    } else {
      if (mounted) {
        setState(() {
          _remaining = diff;
        });
      }
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isUrgent = _remaining.inSeconds <= 60 && _remaining.inSeconds > 0;

    final roseColor = isDark ? C.darkRose : C.lightRose;
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final activeColor = isUrgent ? roseColor : amberColor;
    final bgColor = isUrgent
        ? roseColor.withValues(alpha: isDark ? 0.15 : 0.08)
        : amberColor.withValues(alpha: isDark ? 0.12 : 0.08);
    final borderColor = isUrgent
        ? roseColor.withValues(alpha: 0.3)
        : amberColor.withValues(alpha: 0.25);

    final hours = _remaining.inHours;
    final minutes = (_remaining.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (_remaining.inSeconds % 60).toString().padLeft(2, '0');
    final timeString = hours > 0 ? '$hours:$minutes:$seconds' : '$minutes:$seconds';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(C.radiusCard),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            isUrgent ? Icons.warning_amber_rounded : Icons.timer_outlined,
            size: 15,
            color: activeColor,
          ),
          const SizedBox(width: 6),
          Text(
            'Items held for ',
            style: GoogleFonts.manrope(
              color: isDark ? C.darkText : const Color(0xFF374151),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          Text(
            timeString,
            style: GoogleFonts.jetBrainsMono(
              color: activeColor,
              fontWeight: FontWeight.w700,
              fontSize: 12,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }
}
