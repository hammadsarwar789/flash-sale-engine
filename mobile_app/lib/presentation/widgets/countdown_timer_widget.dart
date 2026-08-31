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
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      _updateRemaining();
    });
  }

  void _updateRemaining() {
    final diff = widget.targetEndTime.difference(DateTime.now());
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

  Widget _buildTimeBox(String value, String unit, bool isUrgent) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
          decoration: BoxDecoration(
            color: C.raised,
            borderRadius: BorderRadius.circular(C.radiusCard),
            border: Border.all(color: isUrgent ? C.amber : C.line),
          ),
          child: Text(
            value,
            style: GoogleFonts.jetBrainsMono(
              color: isUrgent ? C.amber : C.text,
              fontSize: 14,
              fontWeight: FontWeight.bold,
              fontFeatures: [const FontFeature.tabularFigures()],
            ),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          unit,
          style: GoogleFonts.manrope(
            color: C.textMute,
            fontSize: 9,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final hours = _remaining.inHours.toString().padLeft(2, '0');
    final minutes = (_remaining.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (_remaining.inSeconds % 60).toString().padLeft(2, '0');
    final isUrgent = _remaining.inSeconds <= 60 && _remaining.inSeconds > 0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: C.amberSoft,
        borderRadius: BorderRadius.circular(C.radiusCard),
        border: Border.all(color: C.amber.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: const BoxDecoration(
              color: C.amber,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            widget.label,
            style: GoogleFonts.jetBrainsMono(
              color: C.amber,
              fontWeight: FontWeight.w800,
              fontSize: 11,
              letterSpacing: 0.5,
              fontFeatures: [const FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(width: 10),
          _buildTimeBox(hours, 'HRS', isUrgent),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 3),
            child: Text(':', style: GoogleFonts.jetBrainsMono(color: C.amber, fontWeight: FontWeight.bold)),
          ),
          _buildTimeBox(minutes, 'MIN', isUrgent),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 3),
            child: Text(':', style: GoogleFonts.jetBrainsMono(color: C.amber, fontWeight: FontWeight.bold)),
          ),
          _buildTimeBox(seconds, 'SEC', isUrgent),
        ],
      ),
    );
  }
}
