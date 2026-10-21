import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { useTheme } from '../../../theme/theme-context'
import {
  axisTicks,
  donutSegments,
  lineGeometry,
  visibleTickIndexes,
} from '../utils/chart-geometry.util'

const DONUT_SIZE = 120
const DONUT_THICKNESS = 20

/**
 * A rosca dos cartões de pacientes, procedimentos e convênio.
 *
 * `center` é o número que a web põe por cima do anel com um `absolute` —
 * aqui ele é um `<Text>` sobreposto, porque o SVG do React Native não
 * aceita texto com a tipografia do tema.
 */
export function DonutChart({
  values,
  center,
  testID,
}: {
  values: { value: number; color?: string }[]
  center?: string
  testID: string
}) {
  const theme = useTheme()
  const segments = donutSegments(values, { size: DONUT_SIZE, thickness: DONUT_THICKNESS })

  return (
    <View style={styles.donutWrapper} testID={testID}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
        <Circle
          cx={DONUT_SIZE / 2}
          cy={DONUT_SIZE / 2}
          r={DONUT_SIZE / 2 - DONUT_THICKNESS / 2}
          stroke={theme.line}
          strokeWidth={DONUT_THICKNESS}
          fill="none"
        />
        {segments.map((segment, index) => (
          <Path key={index} d={segment.path} fill={segment.color} testID={`${testID}-slice-${index}`} />
        ))}
      </Svg>
      {center ? (
        <View style={styles.donutCenter} pointerEvents="none">
          <Text style={[styles.donutCenterLabel, { color: theme.text }]} testID={`${testID}-total`}>
            {center}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

const CHART_HEIGHT = 150
const AXIS_WIDTH = 28

/**
 * A linha de área da linha do tempo e da distribuição etária.
 *
 * Os rótulos do eixo horizontal são desenhados em `<Text>` do React
 * Native, não em `<Text>` do SVG: assim herdam a fonte e a cor do tema, e
 * o espaçamento sai da mesma régua do resto da tela.
 */
export function AreaLineChart({
  values,
  labels,
  color,
  testID,
}: {
  values: number[]
  labels: string[]
  color: string
  testID: string
}) {
  const theme = useTheme()
  const width = 260
  const geometry = lineGeometry(values, { width, height: CHART_HEIGHT })
  const ticks = axisTicks(geometry.maxValue, 4)
  const visible = visibleTickIndexes(labels.length, 6)

  return (
    <View style={styles.chart} testID={testID}>
      <View style={styles.chartRow}>
        <View style={[styles.axis, { height: CHART_HEIGHT }]}>
          {[...ticks].reverse().map((tick) => (
            <Text key={tick} style={[styles.axisLabel, { color: theme.textMute }]}>
              {tick}
            </Text>
          ))}
        </View>
        <Svg width={width} height={CHART_HEIGHT}>
          {ticks.map((tick) => {
            const y = CHART_HEIGHT - (tick / (geometry.maxValue || 1)) * CHART_HEIGHT
            return (
              <Path
                key={tick}
                d={`M 0 ${y} L ${width} ${y}`}
                stroke={theme.line}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )
          })}
          <Path d={geometry.area} fill={color} fillOpacity={0.18} testID={`${testID}-area`} />
          <Path
            d={geometry.line}
            stroke={color}
            strokeWidth={2}
            fill="none"
            testID={`${testID}-line`}
          />
        </Svg>
      </View>
      <View style={[styles.labels, { paddingLeft: AXIS_WIDTH }]}>
        {visible.map((index) => (
          <Text key={index} style={[styles.axisLabel, { color: theme.textMute }]}>
            {labels[index]}
          </Text>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  donutWrapper: { alignSelf: 'center', width: DONUT_SIZE, height: DONUT_SIZE },
  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  donutCenterLabel: { fontSize: 20, fontWeight: '700' },
  chart: { gap: 6 },
  chartRow: { flexDirection: 'row', gap: 6 },
  axis: { width: AXIS_WIDTH - 6, justifyContent: 'space-between', alignItems: 'flex-end' },
  axisLabel: { fontSize: 10 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
})
