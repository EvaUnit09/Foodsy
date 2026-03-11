package com.foodsy.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "neighborhoods",
       uniqueConstraints = {
           @UniqueConstraint(name = "uq_neighborhood_name_borough", columnNames = {"name", "borough"})
       },
       indexes = {
           @Index(name = "idx_neighborhood_borough", columnList = "borough")
       })
public class Neighborhood {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Column(name = "borough", length = 50, nullable = false)
    private String borough;

    @Column(name = "center_lat", nullable = false)
    private Double centerLat;

    @Column(name = "center_lng", nullable = false)
    private Double centerLng;

    @Column(name = "radius_meters", nullable = false)
    private Integer radiusMeters = 1000;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    public Neighborhood() {}

    public Neighborhood(String name, String borough, double centerLat, double centerLng,
                        int radiusMeters, int displayOrder) {
        this.name = name;
        this.borough = borough;
        this.centerLat = centerLat;
        this.centerLng = centerLng;
        this.radiusMeters = radiusMeters;
        this.displayOrder = displayOrder;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getBorough() { return borough; }
    public void setBorough(String borough) { this.borough = borough; }

    public Double getCenterLat() { return centerLat; }
    public void setCenterLat(Double centerLat) { this.centerLat = centerLat; }

    public Double getCenterLng() { return centerLng; }
    public void setCenterLng(Double centerLng) { this.centerLng = centerLng; }

    public Integer getRadiusMeters() { return radiusMeters; }
    public void setRadiusMeters(Integer radiusMeters) { this.radiusMeters = radiusMeters; }

    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
}
